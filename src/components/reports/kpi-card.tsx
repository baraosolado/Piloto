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
}: Props) {
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
        "rounded-lg border border-[#eeeeee] bg-white p-4 shadow-sm",
        emphasize && "ring-1 ring-black/5",
      )}
    >
      <p className="text-xs text-[#777777]">{label}</p>
      <p
        className={cn(
          "mt-1 font-bold tracking-tight text-black",
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
            good ? "text-[#00A651]" : "text-[#E53935]",
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
