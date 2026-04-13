import { TrendingDown, TrendingUp } from "lucide-react";
import { formatPercent } from "@/lib/format-reports";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  deltaPct?: number | null;
  /** Se true, queda no valor é “bom” (ex.: gastos). */
  invertDelta?: boolean;
  valueClassName?: string;
  subtext?: string;
  emphasize?: boolean;
  /** Ex.: margem líquida — só valor absoluto. */
  hideDelta?: boolean;
  /** Layout alinhado ao PDF “cockpit” (sem delta; nota fixa). */
  cockpit?: boolean;
  cockpitNote?: string;
};

export function KpiCard({
  label,
  value,
  deltaPct,
  invertDelta = false,
  valueClassName,
  subtext,
  emphasize = false,
  hideDelta = false,
  cockpit = false,
  cockpitNote = "Dados do período selecionado",
}: Props) {
  if (cockpit) {
    return (
      <div
        className={cn(
          "flex min-h-[104px] flex-col justify-between rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5",
          emphasize && "ring-2 ring-[#006d33]/30",
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#3b3b3b]">
          {label}
        </p>
        <p
          className={cn(
            "text-2xl font-black tabular-nums tracking-tight text-[#1a1c1c]",
            emphasize && "text-[#006d33]",
            valueClassName,
          )}
        >
          {value}
        </p>
        {subtext ? (
          <p className="text-[11px] text-[#5c5c5c]">{subtext}</p>
        ) : (
          <p className="text-[11px] text-[#3b3b3b]">{cockpitNote}</p>
        )}
      </div>
    );
  }

  const good =
    deltaPct === null || deltaPct === undefined
      ? null
      : invertDelta
        ? deltaPct <= 0
        : deltaPct >= 0;
  const showDelta =
    !hideDelta &&
    deltaPct !== null &&
    deltaPct !== undefined &&
    Number.isFinite(deltaPct);

  return (
    <div
      className={cn(
        "rounded-xl border border-black/10 bg-white p-4 shadow-sm",
        emphasize && "ring-2 ring-[#006d33]/25",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#006d33]/90">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-bold tracking-tight text-[#1a1c1c]",
          emphasize ? "text-xl" : "text-lg",
          valueClassName,
        )}
      >
        {value}
      </p>
      {subtext ? (
        <p className="mt-0.5 text-xs text-[#777777]">{subtext}</p>
      ) : null}
      {showDelta ? (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            good ? "text-[#006d33]" : "text-[#E53935]",
          )}
        >
          {good ? (
            <TrendingUp className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <TrendingDown className="size-3.5 shrink-0" aria-hidden />
          )}
          <span>
            {deltaPct! >= 0 ? "+" : ""}
            {formatPercent(Math.abs(deltaPct!))} vs mês anterior
          </span>
        </div>
      ) : hideDelta ? null : (
        <p className="mt-2 text-xs text-[#777777]">Sem base no mês anterior</p>
      )}
    </div>
  );
}
