import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { maintenanceItems, users } from "@/db/schema";
import {
  calculateEfficiencyScore,
  calculateRideCost,
  calculateRideProfit,
  groupRidesByPlatform,
  type Platform,
  type Vehicle,
} from "@/lib/calculations";
import {
  aggregateExpensesByCategory,
  aggregatePeriodStats,
  fetchExpensesInRange,
  fetchGoalForUtcMonth,
  fetchRidesInRange,
  getUserDisplayName,
  getVehicleForUser,
  goalProgressFromRows,
  type RideRow,
} from "@/lib/dashboard-data";
import { computeMaintenanceDerived } from "@/lib/maintenance-computed";

const WEEK_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const SHIFT_KEY_PT: Record<
  "morning" | "afternoon" | "evening" | "night",
  string
> = {
  night: "Madrugada (0h–6h)",
  morning: "Manhã (6h–12h)",
  afternoon: "Tarde (12h–18h)",
  evening: "Noite (18h–24h)",
};

export type RelatorioPlatformRow = {
  platform: string;
  rideCount: number;
  gross: number;
  avgGross: number;
  netProfit: number;
  profitPerHour: number;
  shareOfGrossPct: number;
};

export type RelatorioShiftRow = {
  rank: number;
  label: string;
  profitPerHour: number;
};

export type RelatorioWeekdayRow = {
  rank: number;
  label: string;
  netProfit: number;
};

export type RelatorioFuelBlock = {
  avgConsumptionKmL: number | null;
  totalLiters: number;
  totalFuelCost: number;
};

export type RelatorioMaintenanceRow = {
  type: string;
  status: "ok" | "warning" | "overdue";
  label: string;
};

export type RelatorioGoalBlock = {
  monthlyTarget: number;
  earnedTowardGoal: number;
  percentage: number;
} | null;

/** Relatório mensal completo (preview na web + base para PDF). */
export type RelatorioMonthReport = {
  reportId: string;
  monthLabel: string;
  month: number;
  year: number;
  generatedAtLabel: string;
  driverName: string;
  driverCity: string | null;
  /** Campos legados / resumo rápido */
  totalRides: number;
  totalKm: number;
  gross: number;
  totalExpenses: number;
  netProfit: number;
  costPerKm: number;
  bestPlatform: string | null;
  bestWeekdayLabel: string | null;
  bestWeekdayProfit: number;
  bestWeekdayProfitPerHour: number | null;
  platformRows: RelatorioPlatformRow[];
  shiftRanking: RelatorioShiftRow[];
  weekdayRanking: RelatorioWeekdayRow[];
  fuel: RelatorioFuelBlock;
  expensesByCategory: { label: string; amount: number }[];
  maintenance: RelatorioMaintenanceRow[];
  currentOdometer: number | null;
  vehicleLabel: string | null;
  goal: RelatorioGoalBlock;
  grossPerHour: number | null;
  netPerHour: number | null;
  grossPerKm: number;
  netPerKm: number;
  /** Faturamento bruto ÷ total de gastos (quando gastos > 0). */
  grossToExpensesRatio: number | null;
  avgRideMinutes: number | null;
  efficiencyGrade: string | null;
  /** Horas com duração registrada nas corridas do mês. */
  workHours: number;
  /** Dias UTC distintos com ao menos uma corrida. */
  workDays: number;
  /** Pior dia da semana por lucro (nome em pt-BR). */
  worstWeekdayLabel: string | null;
  /** Média de lucro líquido por corrida (só corridas com custo válido). */
  ticketMedioLiquido: number | null;
};

function platformLabel(p: Platform): string {
  switch (p) {
    case "uber":
      return "Uber";
    case "99":
      return "99";
    case "indrive":
      return "inDrive";
    case "particular":
      return "Particular";
    default:
      return p;
  }
}

function vehicleFromRow(
  row: Awaited<ReturnType<typeof getVehicleForUser>>,
): Vehicle | null {
  if (!row) return null;
  return {
    fuelConsumption: Number(row.fuelConsumption),
    fuelPrice: Number(row.fuelPrice),
    depreciationPerKm: Number(row.depreciationPerKm),
  };
}

const FAKE_VEHICLE: Vehicle = {
  fuelConsumption: 1,
  fuelPrice: 0,
  depreciationPerKm: 0,
};

function weekdayStats(
  rows: RideRow[],
  vehicle: Vehicle,
): { label: string; profit: number; profitPerHour: number | null }[] {
  const byProfit = [0, 0, 0, 0, 0, 0, 0];
  const byMinutes = [0, 0, 0, 0, 0, 0, 0];
  for (const row of rows) {
    const gross = Number(row.grossAmount);
    const km = Number(row.distanceKm);
    const cost = calculateRideCost(km, vehicle);
    if (Number.isNaN(cost)) continue;
    const profit = calculateRideProfit(gross, cost);
    const wd = row.startedAt.getUTCDay();
    byProfit[wd] += profit;
    byMinutes[wd] += row.durationMinutes ?? 0;
  }
  return WEEK_PT.map((label, i) => {
    const profit = byProfit[i]!;
    const hours = byMinutes[i]! / 60;
    return {
      label,
      profit,
      profitPerHour: hours > 0 ? profit / hours : null,
    };
  });
}

function efficiencyGradeFromNetPerHour(netPerHour: number | null): string | null {
  if (netPerHour === null || netPerHour <= 0) return null;
  if (netPerHour >= 45) return "A+";
  if (netPerHour >= 32) return "A";
  if (netPerHour >= 22) return "B";
  if (netPerHour >= 12) return "C";
  return "D";
}

function maintenanceStatusLabel(s: "ok" | "warning" | "overdue"): string {
  switch (s) {
    case "ok":
      return "Em dia";
    case "warning":
      return "Próximo";
    case "overdue":
      return "Atrasado";
    default:
      return s;
  }
}

export async function getRelatorioMonthPreview(
  userId: string,
  year: number,
  month1to12: number,
): Promise<RelatorioMonthReport> {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month1to12, 0, 23, 59, 59, 999));

  const [
    rideRows,
    expenseRows,
    vehicleRow,
    goalRow,
    maintRows,
    userRow,
  ] = await Promise.all([
    fetchRidesInRange(userId, { start, end }),
    fetchExpensesInRange(userId, { start, end }),
    getVehicleForUser(userId),
    fetchGoalForUtcMonth(userId, year, month1to12),
    db
      .select()
      .from(maintenanceItems)
      .where(eq(maintenanceItems.userId, userId))
      .orderBy(asc(maintenanceItems.type)),
    db
      .select({ name: users.name, city: users.city })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);

  const driverName =
    userRow[0]?.name?.trim() || (await getUserDisplayName(userId)) || "Motorista";
  const driverCity = userRow[0]?.city?.trim() || null;

  const vehicle = vehicleFromRow(vehicleRow);
  const calcVehicle = vehicle ?? FAKE_VEHICLE;

  const { gross, totalExpenses, netProfit, costPerKm } = aggregatePeriodStats(
    rideRows,
    expenseRows,
    vehicle,
  );

  const totalKm = rideRows.reduce((s, r) => s + Number(r.distanceKm), 0);
  const ridesCalc = rideRows.map((r) => ({
    grossAmount: Number(r.grossAmount),
    distanceKm: Number(r.distanceKm),
    startedAt: r.startedAt,
    durationMinutes: r.durationMinutes,
    platform: r.platform,
  }));

  const expensesCalc = expenseRows.map((e) => ({
    category: e.category,
    amount: Number(e.amount),
    occurredAt: e.occurredAt,
  }));

  const byPlat = groupRidesByPlatform(ridesCalc, [], calcVehicle);
  const totalGrossPlatforms = byPlat.reduce((s, p) => s + p.totalGross, 0);

  const platformRows: RelatorioPlatformRow[] = byPlat
    .filter((p) => p.rideCount > 0)
    .map((p) => ({
      platform: platformLabel(p.platform),
      rideCount: p.rideCount,
      gross: p.totalGross,
      avgGross: p.rideCount > 0 ? p.totalGross / p.rideCount : 0,
      netProfit: p.totalNetProfit,
      profitPerHour: p.profitPerHour,
      shareOfGrossPct:
        totalGrossPlatforms > 0
          ? (p.totalGross / totalGrossPlatforms) * 100
          : 0,
    }))
    .sort((a, b) => b.gross - a.gross);

  let bestPlatform: string | null = null;
  let bestNet = -Infinity;
  for (const p of byPlat) {
    if (p.rideCount === 0) continue;
    if (p.totalNetProfit > bestNet) {
      bestNet = p.totalNetProfit;
      bestPlatform = platformLabel(p.platform);
    }
  }

  const efficiency = calculateEfficiencyScore(
    ridesCalc,
    expensesCalc,
    calcVehicle,
  );
  const shiftRanking: RelatorioShiftRow[] = (
    Object.keys(efficiency) as (keyof typeof efficiency)[]
  )
    .map((k) => ({
      label: SHIFT_KEY_PT[k],
      profitPerHour: efficiency[k],
    }))
    .sort((a, b) => b.profitPerHour - a.profitPerHour)
    .map((row, i) => ({ rank: i + 1, ...row }));

  const wdStats = weekdayStats(rideRows, calcVehicle);
  const weekdayRanking: RelatorioWeekdayRow[] = [...wdStats]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 3)
    .map((row, i) => ({
      rank: i + 1,
      label: row.label,
      netProfit: row.profit,
    }));

  const bestWd = [...wdStats].sort((a, b) => b.profit - a.profit)[0];
  const bestWeekdayLabel =
    bestWd && bestWd.profit > 0 ? bestWd.label : null;
  const bestWeekdayProfit = bestWd?.profit ?? 0;
  const bestWeekdayProfitPerHour = bestWd?.profitPerHour ?? null;

  const fuelExpenses = expenseRows.filter((e) => e.category === "fuel");
  const totalFuelCost = fuelExpenses.reduce(
    (s, e) => s + Number(e.amount),
    0,
  );
  const totalLiters = fuelExpenses.reduce((s, e) => {
    const L = e.liters !== null ? Number(e.liters) : 0;
    return s + (Number.isFinite(L) ? L : 0);
  }, 0);

  const fuel: RelatorioFuelBlock = {
    avgConsumptionKmL:
      vehicle && vehicleRow ? Number(vehicleRow.fuelConsumption) : null,
    totalLiters,
    totalFuelCost,
  };

  const expensesByCategory = aggregateExpensesByCategory(expenseRows).map(
    ({ label, amount }) => ({ label, amount }),
  );

  const currentOdometer = vehicleRow?.currentOdometer ?? null;
  const maintenance: RelatorioMaintenanceRow[] = maintRows.map((row) => {
    const d = computeMaintenanceDerived(
      currentOdometer,
      row.lastServiceKm,
      row.intervalKm,
    );
    return {
      type: row.type,
      status: d.status,
      label: maintenanceStatusLabel(d.status),
    };
  });

  const vehicleLabel =
    vehicleRow != null
      ? `${vehicleRow.model} (${vehicleRow.year})`
      : null;

  let goal: RelatorioGoalBlock = null;
  if (goalRow && vehicle) {
    const gp = goalProgressFromRows(goalRow, rideRows, vehicle);
    goal = {
      monthlyTarget: Number(goalRow.monthlyTarget),
      earnedTowardGoal: gp.totalEarned,
      percentage: gp.percentage,
    };
  }

  let totalMinutes = 0;
  let ridesWithDuration = 0;
  for (const r of rideRows) {
    if (r.durationMinutes != null && r.durationMinutes > 0) {
      totalMinutes += r.durationMinutes;
      ridesWithDuration += 1;
    }
  }
  const workHours = totalMinutes / 60;
  const grossPerHour = workHours > 0 ? gross / workHours : null;
  const netPerHour = workHours > 0 ? netProfit / workHours : null;

  const grossPerKm = totalKm > 0 ? gross / totalKm : 0;
  const netPerKm = totalKm > 0 ? netProfit / totalKm : 0;

  const grossToExpensesRatio =
    totalExpenses > 0 ? gross / totalExpenses : null;

  const avgRideMinutes =
    ridesWithDuration > 0 ? totalMinutes / ridesWithDuration : null;

  const efficiencyGrade = efficiencyGradeFromNetPerHour(netPerHour);

  const workDays = uniqueRideUtcDays(rideRows);
  const worstWd = [...wdStats].sort((a, b) => a.profit - b.profit)[0];
  const worstWeekdayLabel =
    worstWd && rideRows.length > 0 ? worstWd.label : null;

  let ticketSum = 0;
  let ticketCount = 0;
  for (const row of rideRows) {
    const gross = Number(row.grossAmount);
    const km = Number(row.distanceKm);
    const cost = calculateRideCost(km, calcVehicle);
    if (Number.isNaN(cost)) continue;
    ticketSum += calculateRideProfit(gross, cost);
    ticketCount += 1;
  }
  const ticketMedioLiquido =
    ticketCount > 0 ? ticketSum / ticketCount : null;

  const monthLabelRaw = new Date(
    Date.UTC(year, month1to12 - 1, 15),
  ).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const monthLabel =
    monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

  const generatedAt = new Date();
  const generatedAtLabel = generatedAt.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const reportId = `RPT-${year}-${String(month1to12).padStart(2, "0")}-${userId.slice(0, 8)}`;

  return {
    reportId,
    monthLabel,
    month: month1to12,
    year,
    generatedAtLabel,
    driverName,
    driverCity,
    totalRides: rideRows.length,
    totalKm,
    gross,
    totalExpenses,
    netProfit,
    costPerKm,
    bestPlatform,
    bestWeekdayLabel,
    bestWeekdayProfit,
    bestWeekdayProfitPerHour,
    platformRows,
    shiftRanking,
    weekdayRanking,
    fuel,
    expensesByCategory,
    maintenance,
    currentOdometer,
    vehicleLabel,
    goal,
    grossPerHour,
    netPerHour,
    grossPerKm,
    netPerKm,
    grossToExpensesRatio,
    avgRideMinutes,
    efficiencyGrade,
    workHours,
    workDays,
    worstWeekdayLabel,
    ticketMedioLiquido,
  };
}

function uniqueRideUtcDays(rows: RideRow[]): number {
  const keys = new Set<string>();
  for (const r of rows) {
    const d = r.startedAt;
    keys.add(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return keys.size;
}


/** @deprecated use RelatorioMonthReport */
export type RelatorioMonthPreview = RelatorioMonthReport;
