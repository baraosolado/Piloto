import { Suspense } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { DashboardRegisterRide } from "@/components/dashboard/dashboard-register-ride";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  aggregateExpensesByCategory,
  aggregatePeriodStats,
  buildDailyProfitSeries,
  fetchExpensesInRange,
  fetchGoalForUtcMonth,
  fetchRecentRidesInRange,
  fetchRidesInRange,
  fetchRidesInUtcMonth,
  getUserDisplayName,
  getVehicleForUser,
  goalProgressFromRows,
} from "@/lib/dashboard-data";
import {
  parseDashboardPeriod,
  resolveDashboardRanges,
} from "@/lib/dashboard-period";
import { requireSession } from "@/lib/get-session";
import {
  calculateRideCost,
  calculateRideProfit,
  type Vehicle,
} from "@/lib/calculations";
import type { RideRow } from "@/lib/dashboard-data";
import { DashboardOnboardingToast } from "./dashboard-onboarding-toast";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function platformBadgeClass(platform: string): string {
  switch (platform) {
    case "uber":
      return "rounded bg-black text-white border-0 text-[9px] font-black uppercase";
    case "99":
      return "rounded bg-orange-500 text-white border-0 text-[9px] font-black uppercase";
    case "indrive":
      return "rounded bg-blue-600 text-white border-0 text-[9px] font-black uppercase";
    default:
      return "rounded bg-neutral-500 text-white border-0 text-[9px] font-black uppercase";
  }
}

function platformLabel(platform: string): string {
  switch (platform) {
    case "uber":
      return "Uber";
    case "99":
      return "99";
    case "indrive":
      return "inDrive";
    case "particular":
      return "Particular";
    default:
      return platform;
  }
}

function rideNetProfit(row: RideRow, vehicle: Vehicle | null): number | null {
  if (!vehicle) return null;
  const cost = calculateRideCost(Number(row.distanceKm), vehicle);
  if (Number.isNaN(cost)) return null;
  return calculateRideProfit(Number(row.grossAmount), cost);
}

function grossTrendLabel(
  current: number,
  previous: number,
): { positive: boolean; label: string } {
  if (previous <= 0) {
    if (current > 0)
      return { positive: true, label: "Sem base no período anterior" };
    return { positive: false, label: "Igual ao período anterior" };
  }
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta * 10) / 10;
  const positive = current > previous;
  return {
    positive,
    label: `${rounded >= 0 ? "+" : ""}${rounded}% vs período anterior`,
  };
}

function formatProjectionCopy(
  projected: Date | null,
  reference: Date,
): string | null {
  if (!projected) return null;
  const days = Math.ceil(
    (projected.getTime() - reference.getTime()) / 86_400_000,
  );
  if (days <= 0) return "Meta já atingida";
  return `Atingirá em ~${days} dia(s)`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const period = parseDashboardPeriod(
    typeof sp.period === "string" ? sp.period : undefined,
  );
  const customFrom = typeof sp.from === "string" ? sp.from : undefined;
  const customTo = typeof sp.to === "string" ? sp.to : undefined;

  const session = await requireSession();
  const userId = session.user.id;

  const now = new Date();
  const { current, previous } = resolveDashboardRanges(
    period,
    now,
    customFrom,
    customTo,
  );

  const [
    displayName,
    vehicleRow,
    rideRows,
    expenseRows,
    prevRideRows,
    prevExpenseRows,
    recentRides,
  ] = await Promise.all([
    getUserDisplayName(userId),
    getVehicleForUser(userId),
    fetchRidesInRange(userId, current),
    fetchExpensesInRange(userId, current),
    fetchRidesInRange(userId, previous),
    fetchExpensesInRange(userId, previous),
    fetchRecentRidesInRange(userId, current, 5),
  ]);

  const vehicleCalc: Vehicle | null = vehicleRow
    ? {
        fuelConsumption: Number(vehicleRow.fuelConsumption),
        fuelPrice: Number(vehicleRow.fuelPrice),
        depreciationPerKm: Number(vehicleRow.depreciationPerKm),
      }
    : null;

  const stats = aggregatePeriodStats(rideRows, expenseRows, vehicleCalc);
  const prevStats = aggregatePeriodStats(
    prevRideRows,
    prevExpenseRows,
    vehicleCalc,
  );
  const grossTrend = grossTrendLabel(stats.gross, prevStats.gross);

  const dailyProfit = buildDailyProfitSeries(
    rideRows,
    vehicleCalc,
    current,
  );
  const expensesByCategory = aggregateExpensesByCategory(expenseRows);

  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const goalRow = await fetchGoalForUtcMonth(userId, y, m);
  const monthRidesForGoal = goalRow
    ? await fetchRidesInUtcMonth(userId, goalRow.year, goalRow.month)
    : [];
  const goalProgress =
    goalRow && vehicleCalc
      ? goalProgressFromRows(goalRow, monthRidesForGoal, vehicleCalc)
      : null;

  const firstName =
    displayName.split(/\s+/)[0] ||
    session.user.email?.split("@")[0] ||
    "aí";

  const todayLabel = format(now, "EEEE, d 'de' MMMM", { locale: ptBR });
  const pctGoal = goalProgress
    ? Math.min(100, Math.round(goalProgress.percentage))
    : 0;

  return (
    <>
      <Suspense fallback={null}>
        <DashboardOnboardingToast />
      </Suspense>

      <DashboardClient
        activePeriod={period}
        customFrom={customFrom}
        customTo={customTo}
      >
        <section className="flex flex-col gap-4 py-2">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="mb-1 block text-[10px] font-bold tracking-[0.2em] text-[#777777] uppercase">
                Visão geral
              </span>
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-black uppercase">
                  Dashboard
                </h1>
                <p className="text-sm capitalize text-[#474747]">
                  Olá, {firstName}! — {todayLabel}
                </p>
              </div>
            </div>
            <DashboardRegisterRide vehicle={vehicleCalc} />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Faturamento bruto"
            value={brl.format(stats.gross)}
            trend={{
              positive: grossTrend.positive,
              label: grossTrend.label,
            }}
          />
          <StatCard
            label="Total de gastos"
            value={brl.format(stats.totalExpenses)}
            hint="Período atual"
            valueClassName="text-[#ba1a1a]"
          />
          <StatCard
            label="Lucro líquido"
            value={brl.format(stats.netProfit)}
            hint="Após custos da corrida e gastos"
            variant="emphasis"
          />
          <StatCard
            label="Custo / km"
            value={`${brl.format(stats.costPerKm)}/km`}
            hint="Combustível ÷ km rodados"
          />
        </section>

        {goalRow && goalProgress && vehicleCalc ? (
          <section className="space-y-4 rounded-xl bg-black p-6 text-white">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
                  Meta do mês
                </p>
                <h2 className="text-xl font-black tracking-tight">
                  {brl.format(Number(goalRow.monthlyTarget))}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold tracking-widest text-[#5adf82] uppercase">
                  Previsão
                </p>
                <p className="text-sm font-bold">
                  {formatProjectionCopy(goalProgress.projectedCompletion, now) ??
                    "—"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-[#006d33] transition-all"
                  style={{ width: `${pctGoal}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold tracking-tight uppercase">
                <span className="text-white/60">
                  {brl.format(goalProgress.totalEarned)} de{" "}
                  {brl.format(Number(goalRow.monthlyTarget))} — {pctGoal}%
                </span>
                <span className="text-[#5adf82]">{pctGoal}% concluído</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-[#eeeeee] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#474747]">
              Defina uma meta mensal para acompanhar seu progresso.
            </p>
            <Link
              href="/metas"
              className="mt-3 inline-flex text-sm font-black tracking-wide text-black uppercase underline-offset-4 hover:underline"
            >
              Definir meta →
            </Link>
          </section>
        )}

        <DashboardCharts
          dailyProfit={dailyProfit}
          expensesByCategory={expensesByCategory}
        />

        <section className="mb-8 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e8e8e8] px-6 py-5">
            <h3 className="text-xs font-black tracking-widest text-black uppercase">
              Últimas corridas
            </h3>
            <Link
              href="/corridas"
              className="text-[10px] font-black tracking-widest text-black uppercase hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#e8e8e8] bg-[#f3f3f3] hover:bg-[#f3f3f3]">
                  <TableHead className="text-[10px] font-bold text-[#777777] uppercase">
                    Plataforma
                  </TableHead>
                  <TableHead className="text-[10px] font-bold text-[#777777] uppercase">
                    Valor bruto
                  </TableHead>
                  <TableHead className="text-[10px] font-bold text-[#777777] uppercase">
                    Lucro líquido
                  </TableHead>
                  <TableHead className="text-[10px] font-bold text-[#777777] uppercase">
                    Data
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRides.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-sm text-[#777777]"
                    >
                      Nenhuma corrida neste período.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRides.map((row) => {
                    const net = rideNetProfit(row, vehicleCalc);
                    return (
                      <TableRow
                        key={row.id}
                        className="border-[#f3f3f3] hover:bg-[#f9f9f9]"
                      >
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={platformBadgeClass(row.platform)}
                          >
                            {platformLabel(row.platform)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-bold">
                          {brl.format(Number(row.grossAmount))}
                        </TableCell>
                        <TableCell className="text-sm font-bold text-[#006d33]">
                          {net === null ? "—" : brl.format(net)}
                        </TableCell>
                        <TableCell className="text-xs text-[#777777]">
                          {format(row.startedAt, "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </DashboardClient>
    </>
  );
}
