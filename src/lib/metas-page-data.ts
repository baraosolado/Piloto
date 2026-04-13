import { goals } from "@/db/schema";
import {
  calculateMonthlyGoalProgress,
  type Goal,
  type Vehicle,
} from "@/lib/calculations";
import {
  fetchExpensesInRange,
  fetchGoalForUtcMonth,
  fetchRidesInUtcMonth,
  getVehicleForUser,
  goalProgressFromRows,
  type RideRow,
} from "@/lib/dashboard-data";
import {
  countRemainingWeekdaysInUtcMonth,
  countWeekdaysInUtcMonth,
  historyBadge,
  type HistoryBadge,
} from "@/lib/metas-utils";
import { vehicleFromVehicleRow } from "@/lib/vehicle-powertrain";

export type MetasHistoryRow = {
  year: number;
  month: number;
  monthLabel: string;
  target: number | null;
  earned: number;
  percent: number | null;
  badge: HistoryBadge;
};

export type MetasPagePayload = {
  year: number;
  month: number;
  monthTitle: string;
  hasVehicle: boolean;
  goalRow: typeof goals.$inferSelect | null;
  monthlyTarget: number | null;
  /** Lucro de corridas − gastos do mês (UTC). */
  totalEarned: number;
  percentage: number;
  dailyAverage: number;
  projectedCompletion: string | null;
  daysToHit: number | null;
  shortfall: number | null;
  achieved: boolean;
  weekdaysInMonth: number;
  remainingWeekdays: number;
  metaDiaria: number | null;
  metaSemanal: number | null;
  ridesThisMonth: number;
  expensesTotalMonth: number;
  history: MetasHistoryRow[];
};

function vehicleFromRow(
  row: Awaited<ReturnType<typeof getVehicleForUser>>,
): Vehicle | null {
  if (!row) return null;
  return vehicleFromVehicleRow(row);
}

const FAKE_VEHICLE: Vehicle = {
  fuelConsumption: 1,
  fuelPrice: 0,
  depreciationPerKm: 0,
  powertrain: "combustion",
};

function utcMonthEnd(year: number, month1to12: number): Date {
  return new Date(Date.UTC(year, month1to12, 0, 23, 59, 59, 999));
}

function monthLabelPt(year: number, month1to12: number): string {
  const d = new Date(Date.UTC(year, month1to12 - 1, 15));
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function shortMonthPt(year: number, month1to12: number): string {
  const d = new Date(Date.UTC(year, month1to12 - 1, 15));
  const m = d.toLocaleDateString("pt-BR", { month: "short" });
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}`;
}

function uniqueUtcDayKeys(dates: Date[]): number {
  const keys = new Set<string>();
  for (const d of dates) {
    keys.add(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return keys.size;
}

function addUtcDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

function rideProfitForMonth(
  gr: typeof goals.$inferSelect,
  rideRows: RideRow[],
  calcVehicle: Vehicle,
): number {
  return goalProgressFromRows(gr, rideRows, calcVehicle).totalEarned;
}

function rideProfitMonthNoGoalRow(
  y: number,
  m: number,
  rideRows: RideRow[],
  calcVehicle: Vehicle,
): number {
  const gFake: Goal = { monthlyTarget: 1, month: m, year: y };
  return calculateMonthlyGoalProgress(
    gFake,
    rideRows.map((r) => ({
      grossAmount: Number(r.grossAmount),
      distanceKm: Number(r.distanceKm),
      startedAt: r.startedAt,
      durationMinutes: r.durationMinutes,
      platform: r.platform,
    })),
    [],
    calcVehicle,
  ).totalEarned;
}

async function netEarnedForUtcMonth(
  userId: string,
  y: number,
  m: number,
  gr: typeof goals.$inferSelect | null,
  calcVehicle: Vehicle,
): Promise<{ net: number; rideRows: RideRow[]; expenseTotal: number }> {
  const rideRows = await fetchRidesInUtcMonth(userId, y, m);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = utcMonthEnd(y, m);
  const expenseRows = await fetchExpensesInRange(userId, { start, end });
  const expenseTotal = expenseRows.reduce(
    (s, e) => s + Number(e.amount),
    0,
  );
  const rideProfit = gr
    ? rideProfitForMonth(gr, rideRows, calcVehicle)
    : rideProfitMonthNoGoalRow(y, m, rideRows, calcVehicle);
  return {
    net: rideProfit - expenseTotal,
    rideRows,
    expenseTotal,
  };
}

function computeNetProjection(
  target: number,
  netEarned: number,
  rideRows: RideRow[],
  expenseRows: { occurredAt: Date }[],
): {
  dailyAverage: number;
  projectedCompletion: Date | null;
} {
  const dates: Date[] = [
    ...rideRows.map((r) => r.startedAt),
    ...expenseRows.map((e) => e.occurredAt),
  ];
  const distinct = uniqueUtcDayKeys(dates);
  const dailyAverage =
    distinct > 0 ? netEarned / distinct : 0;

  let projectedCompletion: Date | null = null;
  if (netEarned >= target && dates.length > 0) {
    projectedCompletion = new Date(
      Math.max(...dates.map((d) => d.getTime())),
    );
  } else if (
    dailyAverage > 0 &&
    netEarned < target &&
    dates.length > 0
  ) {
    const remaining = target - netEarned;
    const daysNeeded = Math.ceil(remaining / dailyAverage);
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
    projectedCompletion = addUtcDays(latest, daysNeeded);
  }

  return { dailyAverage, projectedCompletion };
}

export async function getMetasPageData(
  userId: string,
  now = new Date(),
): Promise<MetasPagePayload> {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const vehicleRow = await getVehicleForUser(userId);
  const vehicle = vehicleFromRow(vehicleRow);
  const calcVehicle = vehicle ?? FAKE_VEHICLE;
  const hasVehicle = vehicle !== null;

  const goalRow = await fetchGoalForUtcMonth(userId, year, month);
  const monthlyTarget = goalRow
    ? Number(goalRow.monthlyTarget)
    : null;

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = utcMonthEnd(year, month);
  const rideRows = await fetchRidesInUtcMonth(userId, year, month);
  const expenseRows = await fetchExpensesInRange(userId, { start, end });
  const expensesTotalMonth = expenseRows.reduce(
    (s, e) => s + Number(e.amount),
    0,
  );

  const ridesThisMonth = rideRows.length;

  let totalEarned = 0;
  let percentage = 0;
  let dailyAverage = 0;
  let projectedCompletion: Date | null = null;

  if (goalRow) {
    const rideProfit = rideProfitForMonth(goalRow, rideRows, calcVehicle);
    totalEarned = rideProfit - expensesTotalMonth;
    const proj = computeNetProjection(
      monthlyTarget!,
      totalEarned,
      rideRows,
      expenseRows,
    );
    dailyAverage = proj.dailyAverage;
    projectedCompletion = proj.projectedCompletion;
    percentage =
      monthlyTarget! > 0 ? (totalEarned / monthlyTarget!) * 100 : 0;
  }

  const weekdaysInMonth = countWeekdaysInUtcMonth(year, month);
  const remainingWeekdays = countRemainingWeekdaysInUtcMonth(
    now,
    year,
    month,
  );

  const metaDiaria =
    monthlyTarget !== null && weekdaysInMonth > 0
      ? monthlyTarget / weekdaysInMonth
      : null;
  const metaSemanal =
    metaDiaria !== null ? metaDiaria * 5 : null;

  const monthEnd = utcMonthEnd(year, month);
  let daysToHit: number | null = null;
  if (
    monthlyTarget !== null &&
    totalEarned < monthlyTarget &&
    projectedCompletion &&
    projectedCompletion.getTime() <= monthEnd.getTime()
  ) {
    const startToday = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const projStart = Date.UTC(
      projectedCompletion.getUTCFullYear(),
      projectedCompletion.getUTCMonth(),
      projectedCompletion.getUTCDate(),
    );
    daysToHit = Math.max(
      0,
      Math.ceil((projStart - startToday) / 86_400_000),
    );
  }

  let shortfall: number | null = null;
  if (
    monthlyTarget !== null &&
    totalEarned < monthlyTarget &&
    dailyAverage > 0 &&
    remainingWeekdays > 0
  ) {
    const projectedTotal = totalEarned + dailyAverage * remainingWeekdays;
    if (projectedTotal < monthlyTarget) {
      shortfall = monthlyTarget - projectedTotal;
    }
  }

  const achieved =
    monthlyTarget !== null && totalEarned >= monthlyTarget - 0.005;

  const history: MetasHistoryRow[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const gr = await fetchGoalForUtcMonth(userId, y, m);
    const { net } = await netEarnedForUtcMonth(userId, y, m, gr, calcVehicle);
    const tgt = gr ? Number(gr.monthlyTarget) : null;
    const pct =
      tgt !== null && tgt > 0 ? (net / tgt) * 100 : null;
    history.push({
      year: y,
      month: m,
      monthLabel: shortMonthPt(y, m),
      target: tgt,
      earned: net,
      percent: pct,
      badge: historyBadge(tgt, net),
    });
  }

  return {
    year,
    month,
    monthTitle: monthLabelPt(year, month),
    hasVehicle,
    goalRow,
    monthlyTarget,
    totalEarned,
    percentage,
    dailyAverage,
    projectedCompletion: projectedCompletion?.toISOString() ?? null,
    daysToHit,
    shortfall,
    achieved,
    weekdaysInMonth,
    remainingWeekdays,
    metaDiaria,
    metaSemanal,
    ridesThisMonth,
    expensesTotalMonth,
    history,
  };
}
