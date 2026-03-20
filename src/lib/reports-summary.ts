import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { maintenanceItems, reportDownloads } from "@/db/schema";
import {
  aggregatePeriodStats,
  fetchExpensesInRange,
  fetchRidesInRange,
  getVehicleForUser,
} from "@/lib/dashboard-data";
import { computeMaintenanceDerived, sumProvisionPerKm } from "@/lib/maintenance-computed";
import { getRelatorioMonthPreview } from "@/lib/relatorio-month-preview";

export type PeriodoAnteriorResumo = {
  lucroLiquido: number;
  faturamentoBruto: number;
  gastos: number;
};

export type ReportDownloadRow = {
  id: string;
  month: number;
  year: number;
  generatedAt: Date;
};

async function fetchReportDownloadsSafe(
  userId: string,
): Promise<ReportDownloadRow[]> {
  try {
    return await db
      .select({
        id: reportDownloads.id,
        month: reportDownloads.month,
        year: reportDownloads.year,
        generatedAt: reportDownloads.generatedAt,
      })
      .from(reportDownloads)
      .where(eq(reportDownloads.userId, userId))
      .orderBy(desc(reportDownloads.generatedAt))
      .limit(6);
  } catch (e) {
    const err = e as {
      code?: string;
      cause?: { code?: string };
      message?: string;
    };
    const code = err.code ?? err.cause?.code;
    const msg = String(err.message ?? "");
    if (
      code === "42P01" ||
      msg.includes("report_downloads") ||
      msg.includes("does not exist") ||
      msg.includes("não existe")
    ) {
      console.warn(
        "[reports-summary] Tabela report_downloads ausente — execute: npm run db:migrate",
      );
      return [];
    }
    throw e;
  }
}

export type ReportsSummary = {
  preview: Awaited<ReturnType<typeof getRelatorioMonthPreview>>;
  hasRides: boolean;
  periodoAnterior: PeriodoAnteriorResumo | null;
  plataformas: {
    platform: string;
    platformKey: "uber" | "99" | "indrive" | "particular";
    corridas: number;
    faturamento: number;
    lucroLiquido: number;
    lucroPorHora: number;
    isBestLucroHora: boolean;
  }[];
  turnos: {
    rank: number;
    turno: string;
    horario: string;
    lucroPorHora: number;
    isBest: boolean;
    isWorst: boolean;
  }[];
  gastosPorCategoria: {
    categoria: string;
    label: string;
    valor: number;
    percentualDoTotal: number;
    ocorrencias: number;
  }[];
  abastecimentos: {
    totalLitros: number;
    totalGasto: number;
    precoMedioLitro: number;
    quantidade: number;
  };
  eficienciaVeiculo: {
    consumoRealKmL: number | null;
    custoKmCombustivel: number;
    custoKmTotal: number;
    depreciacaoKm: number;
  };
  metaDetalhe: {
    definida: boolean;
    monthlyTarget: number | null;
    earned: number;
    percentage: number;
    atingida: boolean;
    superouValor: number | null;
    faltaValor: number | null;
    metaDiaria: number | null;
    melhorDia: string | null;
    piorDia: string | null;
    ticketMedio: number | null;
  };
  manutencao: {
    itens: {
      nome: string;
      status: "ok" | "warning" | "overdue";
      badgeLabel: string;
      kmFaltam: number | null;
    }[];
    provisaoPorKm: number;
    gastoMes: number;
  };
  indicadores: {
    margemLiquidaPct: number | null;
    horasTrabalhadas: number;
    diasTrabalhados: number;
    roiOperacionalPct: number | null;
    rendaHoraBruta: number | null;
    rendaHoraLiquida: number | null;
    ticketMedioLiquido: number | null;
  };
  historicoDownloads: ReportDownloadRow[];
};

function monthRangeUtc(year: number, month1to12: number) {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month1to12, 0, 23, 59, 59, 999));
  return { start, end };
}

function prevMonth(year: number, month1to12: number) {
  if (month1to12 <= 1) return { year: year - 1, month: 12 };
  return { year, month: month1to12 - 1 };
}

const SHIFT_META: {
  labelFull: string;
  turno: string;
  horario: string;
}[] = [
  { labelFull: "Madrugada (0h–6h)", turno: "Madrugada", horario: "00h–06h" },
  { labelFull: "Manhã (6h–12h)", turno: "Manhã", horario: "06h–12h" },
  { labelFull: "Tarde (12h–18h)", turno: "Tarde", horario: "12h–18h" },
  { labelFull: "Noite (18h–24h)", turno: "Noite", horario: "18h–00h" },
];

function mapShiftRow(
  rank: number,
  labelFull: string,
  lucroPorHora: number,
  isBest: boolean,
  isWorst: boolean,
): ReportsSummary["turnos"][0] {
  const meta = SHIFT_META.find((m) => m.labelFull === labelFull);
  return {
    rank,
    turno: meta?.turno ?? labelFull,
    horario: meta?.horario ?? "—",
    lucroPorHora,
    isBest,
    isWorst,
  };
}

function platformKeyFromLabel(
  label: string,
): "uber" | "99" | "indrive" | "particular" {
  const m: Record<string, "uber" | "99" | "indrive" | "particular"> = {
    Uber: "uber",
    "99": "99",
    inDrive: "indrive",
    Particular: "particular",
  };
  return m[label] ?? "particular";
}

export type SerializedReportsSummary = Omit<
  ReportsSummary,
  "historicoDownloads"
> & {
  historicoDownloads: (Omit<ReportDownloadRow, "generatedAt"> & {
    generatedAt: string;
  })[];
};

export function serializeReportsSummary(
  s: ReportsSummary,
): SerializedReportsSummary {
  return {
    ...s,
    historicoDownloads: s.historicoDownloads.map((h) => ({
      id: h.id,
      month: h.month,
      year: h.year,
      generatedAt: h.generatedAt.toISOString(),
    })),
  };
}

export async function getReportsSummary(
  userId: string,
  year: number,
  month1to12: number,
): Promise<ReportsSummary> {
  const [
    preview,
    expenseRows,
    vehicleRow,
    maintRows,
    historicoRows,
  ] = await Promise.all([
    getRelatorioMonthPreview(userId, year, month1to12),
    fetchExpensesInRange(userId, monthRangeUtc(year, month1to12)),
    getVehicleForUser(userId),
    db
      .select()
      .from(maintenanceItems)
      .where(eq(maintenanceItems.userId, userId)),
    fetchReportDownloadsSafe(userId),
  ]);

  const hasRides = preview.totalRides > 0;

  const py = prevMonth(year, month1to12);
  const prevRange = monthRangeUtc(py.year, py.month);
  const [prevRides, prevExpenses] = await Promise.all([
    fetchRidesInRange(userId, prevRange),
    fetchExpensesInRange(userId, prevRange),
  ]);

  const vehicleForAgg =
    vehicleRow != null
      ? {
          fuelConsumption: Number(vehicleRow.fuelConsumption),
          fuelPrice: Number(vehicleRow.fuelPrice),
          depreciationPerKm: Number(vehicleRow.depreciationPerKm),
        }
      : null;

  const prevStats = aggregatePeriodStats(
    prevRides,
    prevExpenses,
    vehicleForAgg,
  );
  const periodoAnterior: PeriodoAnteriorResumo = {
    lucroLiquido: prevStats.netProfit,
    faturamentoBruto: prevStats.gross,
    gastos: prevStats.totalExpenses,
  };

  let bestPph = -Infinity;
  for (const p of preview.platformRows) {
    if (p.rideCount === 0) continue;
    if (p.profitPerHour > bestPph) bestPph = p.profitPerHour;
  }

  const plataformas = preview.platformRows.map((p) => ({
    platform: p.platform,
    platformKey: platformKeyFromLabel(p.platform),
    corridas: p.rideCount,
    faturamento: p.gross,
    lucroLiquido: p.netProfit,
    lucroPorHora: p.profitPerHour,
    isBestLucroHora:
      p.rideCount > 0 && bestPph > -Infinity && p.profitPerHour === bestPph,
  }));

  const shifts = preview.shiftRanking;
  const turnos = shifts.map((s, i) =>
    mapShiftRow(
      s.rank,
      s.label,
      s.profitPerHour,
      i === 0 && shifts.length > 0,
      i === shifts.length - 1 && shifts.length > 1,
    ),
  );

  const totalGastos = preview.totalExpenses;
  const byCat = new Map<
    string,
    { label: string; valor: number; ocorrencias: number }
  >();
  const labels: Record<string, string> = {
    fuel: "Combustível",
    maintenance: "Manutenção",
    insurance: "Seguro",
    fine: "Multa",
    other: "Outros",
  };
  for (const e of expenseRows) {
    const cat = e.category;
    const cur = byCat.get(cat) ?? {
      label: labels[cat] ?? cat,
      valor: 0,
      ocorrencias: 0,
    };
    cur.valor += Number(e.amount);
    cur.ocorrencias += 1;
    byCat.set(cat, cur);
  }
  const gastosPorCategoria = Array.from(byCat.entries())
    .map(([categoria, v]) => ({
      categoria,
      label: v.label,
      valor: v.valor,
      percentualDoTotal:
        totalGastos > 0 ? (v.valor / totalGastos) * 100 : 0,
      ocorrencias: v.ocorrencias,
    }))
    .sort((a, b) => b.valor - a.valor);

  const fuelEx = expenseRows.filter((e) => e.category === "fuel");
  const totalLitros = fuelEx.reduce((s, e) => {
    const L = e.liters != null ? Number(e.liters) : 0;
    return s + (Number.isFinite(L) ? L : 0);
  }, 0);
  const totalFuelCost = fuelEx.reduce((s, e) => s + Number(e.amount), 0);
  const precoMedioLitro =
    totalLitros > 0 ? totalFuelCost / totalLitros : 0;

  const depKm = vehicleRow ? Number(vehicleRow.depreciationPerKm) : 0;
  const custoKmCombustivel = preview.costPerKm;
  const custoKmTotal =
    preview.totalKm > 0
      ? custoKmCombustivel + depKm
      : custoKmCombustivel + depKm;

  const consumoRealKmL =
    totalLitros > 0 && preview.totalKm > 0
      ? preview.totalKm / totalLitros
      : null;

  const currentOdometer = vehicleRow?.currentOdometer ?? null;
  const manutencaoItens = maintRows.map((row) => {
    const d = computeMaintenanceDerived(
      currentOdometer,
      row.lastServiceKm,
      row.intervalKm,
    );
    const badgeLabel =
      d.status === "ok"
        ? "Em dia"
        : d.status === "warning"
          ? "Próximo"
          : "Atrasado";
    const kmFaltam =
      d.kmUntilDue !== null ? Math.max(0, d.kmUntilDue) : null;
    return {
      nome: row.type,
      status: d.status,
      badgeLabel,
      kmFaltam,
    };
  });

  const provisaoPorKm = sumProvisionPerKm(
    maintRows.map((r) => ({
      estimatedCost:
        r.estimatedCost != null ? Number(r.estimatedCost) : null,
      intervalKm: r.intervalKm,
    })),
  );

  const gastoManutencaoMes = expenseRows
    .filter((e) => e.category === "maintenance")
    .reduce((s, e) => s + Number(e.amount), 0);

  const daysInMonth = new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
  const goal = preview.goal;
  const metaDiaria =
    goal != null ? goal.monthlyTarget / daysInMonth : null;
  const atingida = goal != null && goal.earnedTowardGoal >= goal.monthlyTarget;
  const superouValor =
    goal != null && atingida
      ? goal.earnedTowardGoal - goal.monthlyTarget
      : null;
  const faltaValor =
    goal != null && !atingida
      ? Math.max(0, goal.monthlyTarget - goal.earnedTowardGoal)
      : null;

  const margemLiquidaPct =
    preview.gross > 0 ? (preview.netProfit / preview.gross) * 100 : null;
  const roiOperacionalPct =
    preview.totalExpenses > 0
      ? (preview.netProfit / preview.totalExpenses) * 100
      : null;

  return {
    preview,
    hasRides,
    periodoAnterior,
    plataformas,
    turnos,
    gastosPorCategoria,
    abastecimentos: {
      totalLitros,
      totalGasto: totalFuelCost,
      precoMedioLitro,
      quantidade: fuelEx.length,
    },
    eficienciaVeiculo: {
      consumoRealKmL,
      custoKmCombustivel,
      custoKmTotal,
      depreciacaoKm: depKm,
    },
    metaDetalhe: {
      definida: goal != null,
      monthlyTarget: goal?.monthlyTarget ?? null,
      earned: goal?.earnedTowardGoal ?? 0,
      percentage: goal?.percentage ?? 0,
      atingida,
      superouValor,
      faltaValor,
      metaDiaria,
      melhorDia: preview.bestWeekdayLabel,
      piorDia: preview.worstWeekdayLabel,
      ticketMedio: preview.ticketMedioLiquido,
    },
    manutencao: {
      itens: manutencaoItens,
      provisaoPorKm,
      gastoMes: gastoManutencaoMes,
    },
    indicadores: {
      margemLiquidaPct,
      horasTrabalhadas: preview.workHours,
      diasTrabalhados: preview.workDays,
      roiOperacionalPct,
      rendaHoraBruta: preview.grossPerHour,
      rendaHoraLiquida: preview.netPerHour,
      ticketMedioLiquido: preview.ticketMedioLiquido,
    },
    historicoDownloads: historicoRows.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      generatedAt: r.generatedAt,
    })),
  };
}
