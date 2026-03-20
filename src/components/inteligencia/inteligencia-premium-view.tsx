import Link from "next/link";
import type { InteligenciaPremiumData } from "@/lib/inteligencia-data";
import { InteligenciaCostKmChart } from "@/components/inteligencia/inteligencia-cost-km-chart";
import { cn } from "@/lib/utils";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const HEAT_COLORS = ["#F6F6F6", "#CCCCCC", "#888888", "#333333", "#000000"] as const;

function heatmapCellBg(pph: number | null, max: number): string {
  if (pph === null || pph <= 0 || max <= 0) return HEAT_COLORS[0];
  const t = pph / max;
  if (t <= 0.25) return HEAT_COLORS[1];
  if (t <= 0.5) return HEAT_COLORS[2];
  if (t <= 0.75) return HEAT_COLORS[3];
  return HEAT_COLORS[4];
}

function heatmapCellFg(bg: string): string {
  return bg === "#333333" || bg === "#000000" ? "#ffffff" : "#000000";
}

const WEEK_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function platformLabel(p: string): string {
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

function platformBadgeClass(p: string): string {
  switch (p) {
    case "uber":
      return "bg-black text-white";
    case "99":
      return "bg-[#ea580c] text-white";
    case "indrive":
      return "bg-zinc-800 text-white";
    case "particular":
      return "bg-neutral-300 text-black";
    default:
      return "bg-neutral-500 text-white";
  }
}

export type InteligenciaPremiumViewProps = {
  data: InteligenciaPremiumData;
};

export function InteligenciaPremiumView({ data }: InteligenciaPremiumViewProps) {
  const { heatmap, costKmSeries, costKmTrend } = data;
  const prevMonthLabel =
    costKmSeries.length >= 2 ? costKmSeries[costKmSeries.length - 2].label : "mês anterior";

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 pb-16 pt-6 sm:px-6">
      {!data.hasVehicle ? (
        <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Cadastre o veículo em{" "}
          <Link href="/onboarding/veiculo" className="font-bold underline">
            onboarding
          </Link>{" "}
          ou{" "}
          <Link href="/configuracoes/veiculo" className="font-bold underline">
            configurações
          </Link>{" "}
          para ver lucro por turno, mapa de calor e comparativo com custo real.
        </p>
      ) : null}

      <section>
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-black uppercase">
              Score de eficiência
            </h2>
            <p className="text-sm font-medium text-[#777777]">
              Baseado nos últimos 30 dias (lucro líquido ÷ horas com duração
              informada)
            </p>
          </div>
          <span className="hidden w-fit rounded-full bg-[#e8e8e8] px-3 py-1 text-xs font-bold tracking-wider text-black uppercase md:inline">
            Performance
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {data.shifts.map((s) => {
            const isBest = data.bestShift === s.key;
            const isWorst = data.worstShift === s.key;
            const highlight = isBest;
            return (
              <div
                key={s.key}
                className={cn(
                  "relative flex flex-col justify-between rounded-xl p-6 transition-colors",
                  highlight
                    ? "bg-black text-white"
                    : "bg-white hover:bg-[#eeeeee]",
                )}
              >
                {highlight ? (
                  <div
                    className="pointer-events-none absolute -top-4 -right-4 opacity-10"
                    aria-hidden
                  >
                    <span className="text-8xl">☀</span>
                  </div>
                ) : null}
                <div className={cn("relative z-10")}>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold tracking-widest uppercase",
                        highlight ? "text-white/60" : "text-[#777777]",
                      )}
                    >
                      {s.hoursRange}
                    </span>
                    {isBest ? (
                      <span className="rounded-full bg-[#00a651] px-2 py-0.5 text-[9px] font-black tracking-tight text-white uppercase">
                        Melhor turno
                      </span>
                    ) : null}
                    {isWorst ? (
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[9px] font-black tracking-tight text-black uppercase">
                        Mais fraco
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                </div>
                <div className={cn("relative z-10 mt-8")}>
                  <p
                    className={cn(
                      "font-black",
                      highlight ? "text-3xl text-[#5adf82]" : "text-2xl text-black",
                    )}
                  >
                    {brl.format(s.perHour)}/h
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs font-medium",
                      highlight ? "text-white/60" : "text-[#777777]",
                    )}
                  >
                    {s.rideCount} corridas
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-[#f3f3f3] p-6 sm:p-8">
        <h2 className="mb-8 text-xl font-bold tracking-tight text-black uppercase">
          Mapa de calor (lucro/hora)
        </h2>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="mb-4 grid grid-cols-8 gap-3">
              <div className="w-24 shrink-0" />
              {WEEK_SHORT.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-black tracking-tight text-[#777777] uppercase"
                >
                  {d}
                </div>
              ))}
            </div>
            {heatmap.rows.map((row) => (
              <div
                key={row.key}
                className="mb-3 grid grid-cols-8 items-center gap-3 last:mb-0"
              >
                <div className="pr-4 text-right text-[10px] font-bold text-[#777777] leading-tight">
                  {row.title.toUpperCase()}
                  <br />
                  <span className="font-normal opacity-50">{row.hoursRange}</span>
                </div>
                {row.cells.map((cell, i) => {
                  const bg = heatmapCellBg(
                    cell.profitPerHour,
                    heatmap.maxProfitPerHour,
                  );
                  const fg = heatmapCellFg(bg);
                  const label =
                    cell.profitPerHour !== null && cell.profitPerHour > 0
                      ? Math.round(cell.profitPerHour).toString()
                      : "—";
                  return (
                    <div
                      key={i}
                      className="flex aspect-square items-center justify-center rounded-lg border border-[#e8e8e8] text-xs font-bold"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <p className="text-[10px] font-bold tracking-widest text-[#777777] uppercase">
            Escala de lucro/hora
          </p>
          <div className="flex gap-2">
            {HEAT_COLORS.map((c) => (
              <div
                key={c}
                className="size-6 rounded-md border border-[#e8e8e8]"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-xl font-bold tracking-tight text-black uppercase">
          Comparativo de plataformas
        </h2>
        <div className="overflow-hidden rounded-xl border border-[#eeeeee] bg-white">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#f3f3f3]">
              <tr>
                <th className="px-4 py-4 text-[10px] font-black tracking-widest text-[#777777] uppercase sm:px-6">
                  Plataforma
                </th>
                <th className="px-4 py-4 text-right text-[10px] font-black tracking-widest text-[#777777] uppercase sm:px-6">
                  Corridas
                </th>
                <th className="px-4 py-4 text-right text-[10px] font-black tracking-widest text-[#777777] uppercase sm:px-6">
                  Faturamento
                </th>
                <th className="px-4 py-4 text-right text-[10px] font-black tracking-widest text-[#777777] uppercase sm:px-6">
                  Lucro líq.
                </th>
                <th className="px-4 py-4 text-right text-[10px] font-black tracking-widest text-[#777777] uppercase sm:px-6">
                  Lucro/hora
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeee]">
              {data.platforms.map((row) => {
                const isBest = data.bestPlatform === row.platform;
                return (
                  <tr
                    key={row.platform}
                    className={cn(
                      "transition-colors",
                      isBest
                        ? "border-l-4 border-l-[#00a651] bg-[#00a651]/5"
                        : "hover:bg-[#f9f9f9]",
                    )}
                  >
                    <td className="px-4 py-5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded text-[10px] font-black",
                            platformBadgeClass(row.platform),
                          )}
                        >
                          {row.platform === "99"
                            ? "99"
                            : platformLabel(row.platform).slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={cn(
                            "text-sm",
                            isBest ? "font-extrabold" : "font-bold",
                          )}
                        >
                          {platformLabel(row.platform)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right text-sm font-medium sm:px-6">
                      {row.rideCount}
                    </td>
                    <td className="px-4 py-5 text-right text-sm font-medium text-[#777777] sm:px-6">
                      {brl.format(row.totalGross)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-5 text-right text-sm sm:px-6",
                        isBest ? "font-extrabold" : "font-bold",
                      )}
                    >
                      {data.hasVehicle ? brl.format(row.totalNetProfit) : "—"}
                    </td>
                    <td className="px-4 py-5 text-right sm:px-6">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-black tracking-tight",
                          isBest
                            ? "bg-[#00a651] text-white shadow-md shadow-[#00a651]/25"
                            : "bg-[#e8e8e8] text-black",
                        )}
                      >
                        {brl.format(row.profitPerHour)}/h
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pb-4">
        <h2 className="mb-6 text-xl font-bold tracking-tight text-black uppercase">
          Evolução do custo por km
        </h2>
        <div className="relative overflow-hidden rounded-xl bg-black p-6 sm:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-[10px] font-black tracking-widest text-white/60 uppercase">
                Últimos 6 meses
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                {data.latestCostKm != null ? (
                  <>
                    {brl.format(data.latestCostKm)}{" "}
                    <span className="text-sm font-medium text-[#5adf82]">
                      /km no mês atual
                    </span>
                  </>
                ) : (
                  <span className="text-lg text-white/80">
                    Sem km rodados no mês atual
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-white p-3 sm:p-4">
            <InteligenciaCostKmChart
              series={costKmSeries}
              trend={costKmTrend}
              latestLabel={prevMonthLabel}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
