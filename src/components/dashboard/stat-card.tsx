import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: string;
  /** Texto auxiliar abaixo do valor (ex.: período). */
  hint?: string;
  /** Comparativo com período anterior (apenas faturamento usa seta verde conforme TASK). */
  trend?: {
    positive: boolean;
    label: string;
  };
  /** Destaque visual (ex.: lucro líquido maior). */
  variant?: "default" | "emphasis";
  /** Classes extras no valor (ex.: cor de alerta em gastos). */
  valueClassName?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  trend,
  variant = "default",
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex h-32 flex-col justify-between rounded-xl bg-white p-5 shadow-sm",
        variant === "emphasis" && "border-l-4 border-black",
        className,
      )}
    >
      <span className="text-[10px] font-bold tracking-wider text-[#777777] uppercase">
        {label}
      </span>
      <div>
        <div
          className={cn(
            "font-black text-black",
            variant === "emphasis" ? "text-2xl" : "text-xl",
            valueClassName,
          )}
        >
          {value}
        </div>
        {trend ? (
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-[10px] font-bold",
              trend.positive ? "text-[#006d33]" : "text-[#777777]",
            )}
          >
            {trend.positive ? (
              <TrendingUp className="size-3" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="size-3" strokeWidth={2.5} />
            )}
            {trend.label}
          </div>
        ) : hint ? (
          <p className="mt-1 text-[10px] font-medium text-[#777777]">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
