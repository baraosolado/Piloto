import { formatBRL, formatPercent } from "@/lib/format-reports";
import { cn } from "@/lib/utils";

type Props = {
  roiOperacionalPct: number | null;
  ticketMedioLiquido: number | null;
  rendaHoraBruta: number | null;
  rendaHoraLiquida: number | null;
  visual?: "default" | "cockpit";
};

export function ExecutiveSummary(p: Props) {
  const cockpit = p.visual === "cockpit";

  if (cockpit) {
    const cards: {
      title: string;
      value: string;
      valueGreen?: boolean;
    }[] = [
      {
        title: "Ticket méd. líquido",
        value:
          p.ticketMedioLiquido != null
            ? `${formatBRL(p.ticketMedioLiquido)} por corrida`
            : "—",
      },
      {
        title: "Renda bruta/hora",
        value:
          p.rendaHoraBruta != null ? `${formatBRL(p.rendaHoraBruta)}/h` : "—",
      },
      {
        title: "Renda líquida/hora",
        value:
          p.rendaHoraLiquida != null
            ? `${formatBRL(p.rendaHoraLiquida)}/h`
            : "—",
        valueGreen: true,
      },
    ];
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.title}
            className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5"
          >
            <div className="bg-black px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white">
                {c.title}
              </p>
            </div>
            <p
              className={cn(
                "px-3 py-3 text-lg font-black tabular-nums text-[#1a1c1c]",
                c.valueGreen && "text-[#006d33]",
              )}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>
    );
  }

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
