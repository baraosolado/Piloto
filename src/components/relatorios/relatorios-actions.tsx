"use client";

import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, Lock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTHS_PT = [
  { v: "1", label: "Janeiro" },
  { v: "2", label: "Fevereiro" },
  { v: "3", label: "Março" },
  { v: "4", label: "Abril" },
  { v: "5", label: "Maio" },
  { v: "6", label: "Junho" },
  { v: "7", label: "Julho" },
  { v: "8", label: "Agosto" },
  { v: "9", label: "Setembro" },
  { v: "10", label: "Outubro" },
  { v: "11", label: "Novembro" },
  { v: "12", label: "Dezembro" },
];

function yearOptions(currentYear: number): number[] {
  const start = Math.min(2020, currentYear);
  const out: number[] = [];
  for (let y = currentYear + 1; y >= start; y--) out.push(y);
  return out;
}

async function downloadBlob(
  url: string,
  fallbackName: string,
): Promise<{ ok: boolean; filename: string }> {
  const res = await fetch(url, { credentials: "include" });
  const cd = res.headers.get("Content-Disposition");
  let filename = fallbackName;
  if (cd) {
    const m = /filename="([^"]+)"/.exec(cd);
    if (m?.[1]) filename = m[1];
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(err?.error?.message ?? `Erro ${res.status}`);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
  return { ok: true, filename };
}

export function RelatoriosPeriodSelector({
  month,
  year,
}: {
  month: number;
  year: number;
}) {
  const router = useRouter();
  const now = new Date();
  const yNow = now.getUTCFullYear();
  const years = yearOptions(yNow);

  return (
    <section className="mb-8">
      <div className="rounded-lg border border-[#eeeeee] bg-[#f3f3f3] p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="relatorio-mes"
              className="text-xs uppercase tracking-widest text-[#777777]"
            >
              Mês
            </Label>
            <Select
              value={String(month)}
              onValueChange={(v) => {
                router.replace(`/relatorios?month=${v}&year=${year}`);
              }}
            >
              <SelectTrigger id="relatorio-mes" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_PT.map((m) => (
                  <SelectItem key={m.v} value={m.v}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="relatorio-ano"
              className="text-xs uppercase tracking-widest text-[#777777]"
            >
              Ano
            </Label>
            <Select
              value={String(year)}
              onValueChange={(v) => {
                router.replace(`/relatorios?month=${month}&year=${v}`);
              }}
            >
              <SelectTrigger id="relatorio-ano" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RelatoriosExportButtons({
  month,
  year,
  isPremium,
}: {
  month: number;
  year: number;
  isPremium: boolean;
}) {
  const router = useRouter();
  const q = `month=${month}&year=${year}`;

  const goPlanos = () => {
    router.push("/planos");
  };

  const onPdf = async () => {
    if (!isPremium) {
      goPlanos();
      return;
    }
    try {
      await downloadBlob(
        `/api/reports/pdf?${q}`,
        `piloto-relatorio-${year}-${String(month).padStart(2, "0")}.pdf`,
      );
      toast.success("PDF baixado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao baixar PDF.");
    }
  };

  const onRidesCsv = async () => {
    if (!isPremium) {
      goPlanos();
      return;
    }
    try {
      await downloadBlob(
        `/api/rides/export?${q}`,
        `piloto-corridas-${year}-${String(month).padStart(2, "0")}.csv`,
      );
      toast.success("CSV de corridas baixado.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Falha ao exportar corridas.",
      );
    }
  };

  const onExpensesCsv = async () => {
    if (!isPremium) {
      goPlanos();
      return;
    }
    try {
      await downloadBlob(
        `/api/expenses/export?${q}`,
        `piloto-gastos-${year}-${String(month).padStart(2, "0")}.csv`,
      );
      toast.success("CSV de gastos baixado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar gastos.");
    }
  };

  return (
    <section className="mb-10 print:hidden">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#777777]">
            Exportação
          </h2>
          {!isPremium ? (
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wide">
              Premium
            </Badge>
          ) : null}
        </div>
        <div className="space-y-3">
          <Button
            type="button"
            variant="default"
            className={cn(
              "h-14 w-full justify-between rounded-lg px-5",
              !isPremium && "opacity-95",
            )}
            onClick={onPdf}
            title={!isPremium ? "Disponível no plano Premium" : undefined}
          >
            <span className="flex items-center gap-3">
              <FileText className="size-4 shrink-0" aria-hidden />
              <span className="font-bold">Baixar relatório PDF</span>
            </span>
            {!isPremium ? (
              <Lock className="size-4 shrink-0 opacity-80" aria-hidden />
            ) : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-14 w-full justify-between rounded-lg border-[#c6c6c6]/40 px-5",
            )}
            onClick={onRidesCsv}
            title={!isPremium ? "Disponível no plano Premium" : undefined}
          >
            <span className="flex items-center gap-3">
              <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="font-bold">Exportar corridas (CSV)</span>
            </span>
            {!isPremium ? (
              <Lock className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
            ) : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-14 w-full justify-between rounded-lg border-[#c6c6c6]/40 px-5"
            onClick={onExpensesCsv}
            title={!isPremium ? "Disponível no plano Premium" : undefined}
          >
            <span className="flex items-center gap-3">
              <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="font-bold">Exportar gastos (CSV)</span>
            </span>
            {!isPremium ? (
              <Lock className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
            ) : null}
          </Button>
        </div>
      </section>
  );
}
