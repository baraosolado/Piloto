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
};

export function GoalSummaryCard(p: Props) {
  if (!p.definida || p.monthlyTarget === null) {
    return (
      <div className="rounded-lg border border-[#eeeeee] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-black">Meta do mês</h3>
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
    <div className="rounded-lg border border-[#eeeeee] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-black">Meta do mês</h3>
        {p.atingida ? (
          <Badge className="border-0 bg-[#00A651] text-white hover:bg-[#00A651]">
            ✓ Atingida — {formatPercent(p.percentage)}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">
            {formatPercent(Math.min(100, p.percentage))} concluído
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-black">
          Meta:{" "}
          <span className="font-semibold">{formatBRL(p.monthlyTarget)}</span>
        </p>
      </div>
      <div className="mt-3 h-1.5 w-full bg-[#EEEEEE]">
        <div
          className="h-full bg-black"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {p.atingida && p.superouValor != null && p.superouValor >= 0
          ? `${formatBRL(p.earned)} alcançados · superou em ${formatBRL(p.superouValor)}`
          : p.faltaValor != null
            ? `Faltam ${formatBRL(p.faltaValor)} para atingir a meta`
            : null}
      </p>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Meta diária</dt>
          <dd className="font-medium tabular-nums">
            {p.metaDiaria != null ? formatBRL(p.metaDiaria) : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Melhor dia</dt>
          <dd className="font-medium">{p.melhorDia ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Pior dia</dt>
          <dd className="font-medium">{p.piorDia ?? "—"}</dd>
        </div>
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
      </dl>
    </div>
  );
}
