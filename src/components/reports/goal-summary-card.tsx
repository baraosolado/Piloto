import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL, formatPercent } from "@/lib/format-reports";
import { cn } from "@/lib/utils";

type Props = {
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
  visual?: "default" | "cockpit";
};

export function GoalSummaryCard(p: Props) {
  const cockpit = p.visual === "cockpit";
  const shell = cockpit
    ? "rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5"
    : "rounded-lg border border-[#eeeeee] bg-white p-5 shadow-sm";

  if (!p.definida || p.monthlyTarget === null) {
    return (
      <div className={shell}>
        <h3
          className={cn(
            "font-semibold text-black",
            cockpit ? "text-xs font-bold uppercase tracking-[0.12em]" : "text-sm",
          )}
        >
          Meta do mês
        </h3>
        {cockpit ? <div className="mt-2 h-px w-full bg-[#c6c6c6]" /> : null}
        <p className="mt-2 text-sm text-muted-foreground">
          Você ainda não definiu uma meta de lucro para este mês.
        </p>
        <Button
          asChild
          variant="link"
          className="mt-2 h-auto p-0 font-semibold text-black underline"
        >
          <Link href="/metas">Definir meta para este mês →</Link>
        </Button>
      </div>
    );
  }

  const pct = Math.min(100, p.percentage);

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className={cn(
            "font-semibold text-black",
            cockpit ? "text-xs font-bold uppercase tracking-[0.12em]" : "text-sm",
          )}
        >
          Meta do mês
        </h3>
        {p.atingida ? (
          <Badge className="border-0 bg-[#006d33] text-white hover:bg-[#006d33]">
            ✓ Atingida — {formatPercent(p.percentage)}
          </Badge>
        ) : (
          <span
            className={cn(
              "text-sm",
              cockpit ? "font-medium text-[#3b3b3b]" : "text-muted-foreground",
            )}
          >
            {formatPercent(Math.min(100, p.percentage))} concluído
          </span>
        )}
      </div>
      {cockpit ? <div className="mt-2 h-px w-full bg-[#c6c6c6]" /> : null}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-black">
          Meta:{" "}
          <span className="font-semibold">{formatBRL(p.monthlyTarget)}</span>
        </p>
      </div>
      <div
        className={cn(
          "mt-3 h-2 w-full overflow-hidden rounded-md bg-[#e8e8e8]",
          !cockpit && "h-1.5 rounded-none bg-[#EEEEEE]",
        )}
      >
        <div
          className={cn("h-full", cockpit ? "bg-[#006d33]" : "bg-black")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-xs",
          cockpit
            ? "font-semibold text-[#006d33]"
            : "text-muted-foreground",
        )}
      >
        {p.atingida && p.superouValor != null && p.superouValor >= 0
          ? `${formatBRL(p.earned)} alcançados · superou em ${formatBRL(p.superouValor)}`
          : p.faltaValor != null
            ? `Faltam ${formatBRL(p.faltaValor)} para atingir a meta`
            : null}
      </p>
      <dl
        className={cn(
          "mt-4 grid gap-2 text-sm",
          cockpit && "grid-cols-1 sm:grid-cols-3 sm:gap-3",
        )}
      >
        <div
          className={cn(
            "flex justify-between gap-4",
            cockpit &&
              "rounded-md bg-[#f3f3f3] px-3 py-2 sm:flex-col sm:justify-start",
          )}
        >
          <dt
            className={cn(
              cockpit
                ? "text-[10px] font-bold uppercase tracking-wide text-[#3b3b3b]"
                : "text-muted-foreground",
            )}
          >
            Meta diária
          </dt>
          <dd className="font-bold tabular-nums text-[#1a1c1c]">
            {p.metaDiaria != null ? formatBRL(p.metaDiaria) : "—"}
          </dd>
        </div>
        <div
          className={cn(
            "flex justify-between gap-4",
            cockpit &&
              "rounded-md bg-[#f3f3f3] px-3 py-2 sm:flex-col sm:justify-start",
          )}
        >
          <dt
            className={cn(
              cockpit
                ? "text-[10px] font-bold uppercase tracking-wide text-[#3b3b3b]"
                : "text-muted-foreground",
            )}
          >
            Melhor dia
          </dt>
          <dd className="font-bold text-[#1a1c1c]">{p.melhorDia ?? "—"}</dd>
        </div>
        <div
          className={cn(
            "flex justify-between gap-4",
            cockpit &&
              "rounded-md bg-[#f3f3f3] px-3 py-2 sm:flex-col sm:justify-start",
          )}
        >
          <dt
            className={cn(
              cockpit
                ? "text-[10px] font-bold uppercase tracking-wide text-[#3b3b3b]"
                : "text-muted-foreground",
            )}
          >
            Pior dia
          </dt>
          <dd className="font-bold text-[#1a1c1c]">{p.piorDia ?? "—"}</dd>
        </div>
        {!cockpit ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Ticket médio</dt>
            <dd
              className={cn(
                "font-medium tabular-nums",
                !p.ticketMedio && "text-muted-foreground",
              )}
            >
              {p.ticketMedio != null
                ? `${formatBRL(p.ticketMedio)} por corrida`
                : "—"}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
