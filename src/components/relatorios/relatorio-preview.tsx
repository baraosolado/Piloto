import type { RelatorioMonthReport } from "@/lib/relatorio-month-preview";
import {
  consumptionUnitSuffix,
  fuelVolumeUnitShort,
} from "@/lib/vehicle-powertrain";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

function statusPillClass(status: "ok" | "warning" | "overdue") {
  switch (status) {
    case "ok":
      return "bg-[#006d33] text-white";
    case "warning":
      return "bg-amber-500 text-white";
    case "overdue":
      return "bg-[#ba1a1a] text-white";
    default:
      return "bg-neutral-600 text-white";
  }
}

export function RelatorioPreview({ data }: { data: RelatorioMonthReport }) {
  const fuelPt = data.fuel.powertrain;
  const consUnit = consumptionUnitSuffix(fuelPt);
  const volUnit = fuelVolumeUnitShort(fuelPt);
  const isElectricVehicle = fuelPt === "electric";

  const kmFmt = data.totalKm.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  });
  const costKm =
    data.costPerKm > 0 ? brl.format(data.costPerKm) : "—";
  const hasKm = data.totalKm > 0;

  return (
    <section className="mb-10 print:mb-0">
      <div className="rounded-none bg-[#f3f3f3] p-4 pb-8 print:bg-white print:p-0">
        <div className="mx-auto max-w-[210mm] bg-white p-6 shadow-[0_0_10px_rgba(0,0,0,0.08)] print:shadow-none print:p-[5mm] md:p-[8mm]">
          {/* Header */}
          <header className="mb-8 flex flex-col justify-between gap-4 border-b-2 border-black pb-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                Copilote • Relatório mensal
              </p>
              <h2 className="font-black text-2xl tracking-tighter text-black uppercase">
                Performance
              </h2>
              <p className="mt-1 text-xs text-neutral-600">
                {data.driverName}
                {data.driverCity ? ` · ${data.driverCity}` : ""}
                {data.vehicleLabel ? ` · ${data.vehicleLabel}` : ""}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-lg font-bold text-black uppercase">
                {data.monthLabel}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">
                ID: {data.reportId}
              </p>
            </div>
          </header>

          {/* Plataformas */}
          <section className="mb-8">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-black">
              Volume por plataforma
            </h3>
            <div className="bg-[#f3f3f3] p-1">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#c6c6c6]/30 text-[10px] font-medium uppercase text-neutral-500">
                      <th className="px-4 py-3">Plataforma</th>
                      <th className="px-4 py-3">Corridas</th>
                      <th className="px-4 py-3">Faturamento</th>
                      <th className="px-4 py-3">Média / corrida</th>
                      <th className="px-4 py-3">Lucro líq.</th>
                      <th className="px-4 py-3 text-right">% do faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.platformRows.length === 0 ? (
                      <tr className="border-b border-[#eeeeee] bg-white">
                        <td
                          colSpan={6}
                          className="px-4 py-6 text-center text-neutral-500"
                        >
                          Nenhuma corrida no período.
                        </td>
                      </tr>
                    ) : (
                      data.platformRows.map((row, i) => (
                        <tr
                          key={row.platform}
                          className={
                            i % 2 === 0
                              ? "border-b border-[#eeeeee] bg-white"
                              : "border-b border-[#eeeeee] bg-[#f9f9f9]"
                          }
                        >
                          <td className="px-4 py-3 font-bold text-black">
                            {row.platform}
                            {i === 0 && data.platformRows.length > 1 ? (
                              <span className="ml-1 text-[#006d33]">★</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{row.rideCount}</td>
                          <td className="px-4 py-3">{brl.format(row.gross)}</td>
                          <td className="px-4 py-3">{brl.format(row.avgGross)}</td>
                          <td className="px-4 py-3">{brl.format(row.netProfit)}</td>
                          <td
                            className={`px-4 py-3 text-right font-bold ${
                              i === 0 ? "text-[#006d33]" : "text-neutral-600"
                            }`}
                          >
                            {pct.format(row.shareOfGrossPct)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <div className="mb-8 grid gap-8 md:grid-cols-2">
            <section>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-black">
                Performance por turno (lucro / h)
              </h3>
              <div className="flex flex-col gap-2">
                {data.shiftRanking.map((s, idx) => (
                  <div
                    key={s.label}
                    className={
                      idx === 0
                        ? "flex items-center justify-between border-l-4 border-black bg-white p-4"
                        : "flex items-center justify-between bg-[#f3f3f3] p-4"
                    }
                  >
                    <span
                      className={
                        idx === 0
                          ? "text-sm font-bold"
                          : "text-sm font-medium text-neutral-600"
                      }
                    >
                      {s.rank}º {s.label}
                    </span>
                    <span
                      className={
                        idx === 0
                          ? "text-lg font-bold"
                          : "text-base font-medium"
                      }
                    >
                      {s.profitPerHour > 0
                        ? `${brl.format(s.profitPerHour)}/h`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-black">
                Melhores dias (lucro líquido)
              </h3>
              <div className="flex flex-col gap-2">
                {data.weekdayRanking.length === 0 ||
                data.weekdayRanking.every((w) => w.netProfit <= 0) ? (
                  <p className="text-sm text-neutral-500">
                    Sem dados de lucro por dia no período.
                  </p>
                ) : (
                  data.weekdayRanking.map((w, idx) => (
                    <div
                      key={w.label}
                      className={
                        idx === 0
                          ? "flex items-center justify-between border-l-4 border-black bg-white p-4"
                          : "flex items-center justify-between bg-[#f3f3f3] p-4"
                      }
                    >
                      <span
                        className={
                          idx === 0
                            ? "text-sm font-bold"
                            : "text-sm font-medium text-neutral-600"
                        }
                      >
                        {w.rank}º {w.label}
                      </span>
                      <span
                        className={
                          idx === 0
                            ? "text-lg font-bold"
                            : "text-base font-medium"
                        }
                      >
                        {brl.format(w.netProfit)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="mb-8 grid gap-8 md:grid-cols-2">
            <section>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-black">
                {isElectricVehicle ? "Energia (mês)" : "Combustível (mês)"}
              </h3>
              <div className="flex flex-col gap-4 bg-[#f3f3f3] p-6">
                <div className="flex items-baseline justify-between border-b border-[#c6c6c6]/30 pb-2">
                  <span className="text-[10px] font-medium uppercase text-neutral-500">
                    Consumo cadastrado ({consUnit})
                  </span>
                  <span className="text-xl font-bold">
                    {data.fuel.avgConsumptionKmL != null
                      ? `${data.fuel.avgConsumptionKmL.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${consUnit}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-b border-[#c6c6c6]/30 pb-2">
                  <span className="text-[10px] font-medium uppercase text-neutral-500">
                    {isElectricVehicle ? "Total (kWh)" : "Total abastecido"}
                  </span>
                  <span className="text-xl font-bold">
                    {data.fuel.totalLiters > 0
                      ? `${data.fuel.totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${volUnit}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-medium uppercase text-neutral-500">
                    {isElectricVehicle ? "Custo de energia" : "Custo combustível"}
                  </span>
                  <span className="text-xl font-bold">
                    {brl.format(data.fuel.totalFuelCost)}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-black">
                Veículo e manutenção
              </h3>
              <div className="flex flex-col gap-3 bg-[#f3f3f3] p-6">
                {data.maintenance.length === 0 ? (
                  <p className="text-sm text-neutral-600">
                    Nenhum item de manutenção cadastrado.
                  </p>
                ) : (
                  data.maintenance.map((m) => (
                    <div
                      key={m.type}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-sm font-medium text-neutral-800">
                        {m.type}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(m.status)}`}
                      >
                        {m.label}
                      </span>
                    </div>
                  ))
                )}
                <div className="mt-2 border-t border-[#c6c6c6]/30 pt-3">
                  <p className="text-[10px] font-medium uppercase text-neutral-500">
                    Km atual (odômetro)
                  </p>
                  <p className="text-lg font-bold">
                    {data.currentOdometer != null
                      ? `${data.currentOdometer.toLocaleString("pt-BR")} km`
                      : "—"}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Gastos por categoria */}
          <section className="mb-8">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-black">
              Gastos por categoria
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.expensesByCategory.length === 0 ? (
                <p className="text-sm text-neutral-500">Nenhum gasto no mês.</p>
              ) : (
                data.expensesByCategory.map((e) => (
                  <div
                    key={e.label}
                    className="flex items-center justify-between border border-[#eeeeee] bg-[#f9f9f9] px-4 py-3"
                  >
                    <span className="text-sm font-medium">{e.label}</span>
                    <span className="font-bold">{brl.format(e.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Meta */}
          {data.goal ? (
            <section className="mb-8 rounded-lg border border-[#006d33]/40 bg-[#f9fff9] p-6">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#006d33]">
                Meta do mês
              </h3>
              <p className="text-sm text-neutral-700">
                Meta: {brl.format(data.goal.monthlyTarget)} · Alcançado:{" "}
                {brl.format(data.goal.earnedTowardGoal)} (
                {pct.format(Math.min(data.goal.percentage, 999))}%)
              </p>
            </section>
          ) : null}

          {/* Indicadores estratégicos */}
          <section className="mb-8">
            <h3 className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-black">
              Resumo de indicadores
            </h3>
            <div className="border border-black p-6 md:p-8">
              <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
                <MetricRow
                  label="Renda bruta / hora (est.)"
                  value={
                    data.grossPerHour != null
                      ? brl.format(data.grossPerHour)
                      : "—"
                  }
                />
                <MetricRow
                  label="Renda líquida / hora (est.)"
                  value={
                    data.netPerHour != null ? brl.format(data.netPerHour) : "—"
                  }
                  accent
                />
                <MetricRow
                  label="Faturamento ÷ gastos"
                  value={
                    data.grossToExpensesRatio != null
                      ? `${data.grossToExpensesRatio.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×`
                      : "—"
                  }
                />
                <MetricRow
                  label="Bruto por km"
                  value={hasKm ? brl.format(data.grossPerKm) : "—"}
                />
                <MetricRow
                  label="Lucro líquido por km"
                  value={hasKm ? brl.format(data.netPerKm) : "—"}
                  accent
                />
                <MetricRow label="Custo por km (combustível)" value={costKm} />
                <MetricRow
                  label="Tempo médio por corrida"
                  value={
                    data.avgRideMinutes != null
                      ? `${Math.round(data.avgRideMinutes)} min`
                      : "—"
                  }
                />
                <MetricRow
                  label="Nota de eficiência (líq./h)"
                  value={data.efficiencyGrade ?? "—"}
                  accent
                />
                <MetricRow label="Total de corridas" value={String(data.totalRides)} />
                <MetricRow label="Km rodados" value={`${kmFmt} km`} />
                <MetricRow
                  label="Melhor plataforma (lucro)"
                  value={data.bestPlatform ?? "—"}
                />
                <MetricRow
                  label="Melhor dia da semana"
                  value={data.bestWeekdayLabel ?? "—"}
                />
              </div>
              <p className="mt-4 text-[10px] text-neutral-500">
                Horas estimadas pela soma de durações registradas nas corridas.
                Métricas que dependem de veículo cadastrado podem aparecer como
                &quot;—&quot; se faltar dados.
              </p>
            </div>
          </section>

          <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#c6c6c6] pt-4 text-[9px] uppercase tracking-widest text-neutral-400 sm:flex-row sm:items-center">
            <p>
              Copilote · Gerado em {data.generatedAtLabel} · Confidencial
            </p>
            <span className="inline-flex w-fit bg-black px-3 py-1 text-[10px] font-black text-white">
              1 / 1
            </span>
          </footer>
        </div>
      </div>
    </section>
  );
}

function MetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
      <span className="text-xs font-medium text-neutral-600 uppercase">
        {label}
      </span>
      <span
        className={`text-right text-lg font-black ${
          accent ? "text-[#006d33]" : "text-black"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
