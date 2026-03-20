import { formatBRL, formatPercent } from "@/lib/format-reports";

type Props = {
  roiOperacionalPct: number | null;
  ticketMedioLiquido: number | null;
  rendaHoraBruta: number | null;
  rendaHoraLiquida: number | null;
};

export function ExecutiveSummary(p: Props) {
  const items: { label: string; value: string }[] = [
    {
      label: "ROI operacional",
      value:
        p.roiOperacionalPct != null
          ? formatPercent(p.roiOperacionalPct)
          : "—",
    },
    {
      label: "Ticket médio líquido",
      value:
        p.ticketMedioLiquido != null
          ? formatBRL(p.ticketMedioLiquido)
          : "—",
    },
    {
      label: "Renda bruta/hora",
      value:
        p.rendaHoraBruta != null ? `${formatBRL(p.rendaHoraBruta)}/h` : "—",
    },
    {
      label: "Renda líquida/hora",
      value:
        p.rendaHoraLiquida != null
          ? `${formatBRL(p.rendaHoraLiquida)}/h`
          : "—",
    },
  ];

  return (
    <div className="rounded-lg border border-[#eeeeee] bg-white p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label}>
            <p className="text-[11px] text-[#777777]">{it.label}</p>
            <p className="mt-0.5 text-sm font-bold text-black">{it.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
