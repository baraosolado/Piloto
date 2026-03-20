"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  FileDown,
  FileText,
  FileX,
  Lock,
  Table,
} from "lucide-react";
import { toast } from "sonner";
import { RideFormDrawer } from "@/components/rides/ride-form-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Vehicle } from "@/lib/calculations";
import {
  formatBRL,
  formatHoras,
  formatInt,
  formatKm,
  formatPercent,
} from "@/lib/format-reports";
import type { SerializedReportsSummary } from "@/lib/reports-summary";
import { ExecutiveSummary } from "./executive-summary";
import { ExpensesTable } from "./expenses-table";
import { FuelVehicleCard } from "./fuel-vehicle-card";
import { GoalSummaryCard } from "./goal-summary-card";
import { KpiCard } from "./kpi-card";
import { PlatformTable } from "./platform-table";
import { ShiftScoreTable } from "./shift-score-table";

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildLast12Months(): { month: number; year: number; label: string }[] {
  const out: { month: number; year: number; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    const month = d.getUTCMonth() + 1;
    const year = d.getUTCFullYear();
    const raw = d.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    out.push({ month, year, label });
  }
  return out;
}

async function downloadBlob(
  url: string,
  fallbackName: string,
): Promise<void> {
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
}

type Props = {
  summary: SerializedReportsSummary;
  isPremium: boolean;
  vehicle: Vehicle | null;
};

export function RelatoriosClient({ summary, isPremium, vehicle }: Props) {
  const router = useRouter();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { preview, periodoAnterior, hasRides } = summary;
  const month = preview.month;
  const year = preview.year;
  const q = `month=${month}&year=${year}`;

  const monthOptions = useMemo(() => buildLast12Months(), []);
  const selectValue = `${month}-${year}`;

  const prev = periodoAnterior;
  const dGross =
    prev != null ? pctDelta(preview.gross, prev.faturamentoBruto) : null;
  const dExp =
    prev != null ? pctDelta(preview.totalExpenses, prev.gastos) : null;
  const dNet =
    prev != null ? pctDelta(preview.netProfit, prev.lucroLiquido) : null;

  const openUpgrade = () => setUpgradeOpen(true);

  const onPdf = async () => {
    if (!isPremium) {
      openUpgrade();
      return;
    }
    setPdfLoading(true);
    try {
      await downloadBlob(
        `/api/reports/pdf?${q}`,
        `piloto-relatorio-${year}-${String(month).padStart(2, "0")}.pdf`,
      );
      toast.success("PDF baixado.");
      router.refresh();
    } catch {
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setPdfLoading(false);
    }
  };

  const onRidesCsv = async () => {
    if (!isPremium) {
      openUpgrade();
      return;
    }
    try {
      await downloadBlob(
        `/api/rides/export?${q}`,
        `corridas-${month}-${year}.csv`,
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
      openUpgrade();
      return;
    }
    try {
      await downloadBlob(
        `/api/expenses/export?${q}`,
        `gastos-${month}-${year}.csv`,
      );
      toast.success("CSV de gastos baixado.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Falha ao exportar gastos.",
      );
    }
  };

  const onHistoricoPdf = async (m: number, y: number) => {
    if (!isPremium) {
      openUpgrade();
      return;
    }
    try {
      await downloadBlob(
        `/api/reports/pdf?month=${m}&year=${y}`,
        `piloto-relatorio-${y}-${String(m).padStart(2, "0")}.pdf`,
      );
    } catch {
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[22px] font-medium text-black">Relatórios</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={!isPremium || pdfLoading}
            title={
              !isPremium ? "Disponível no Premium" : undefined
            }
            className="gap-2 bg-black text-white hover:bg-black/90 disabled:opacity-60"
            onClick={onPdf}
          >
            {!isPremium ? (
              <Lock className="size-4" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            Baixar PDF
          </Button>
        </div>
      </header>

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={selectValue}
          onValueChange={(v) => {
            const [m, y] = v.split("-").map(Number);
            router.push(`/relatorios?month=${m}&year=${y}`);
          }}
        >
          <SelectTrigger className="h-10 w-[200px] border-[#eeeeee] bg-white">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => (
              <SelectItem key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div
          className="flex h-10 min-w-[200px] cursor-not-allowed items-center justify-between gap-2 rounded-md border border-[#eeeeee] bg-white px-3 text-sm text-muted-foreground"
          title="Em breve"
        >
          <span>Período completo</span>
          <Badge variant="secondary" className="text-[10px]">
            Em breve
          </Badge>
        </div>
      </section>

      <section className="mb-5 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-[#eeeeee] bg-white"
          onClick={onPdf}
        >
          <FileDown className="size-4" aria-hidden />
          Exportar PDF completo
          {!isPremium ? (
            <Lock className="size-3.5 shrink-0" aria-hidden />
          ) : null}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-[#eeeeee] bg-white"
          onClick={onRidesCsv}
        >
          <Table className="size-4" aria-hidden />
          CSV — Corridas
          {!isPremium ? <Lock className="size-3.5" aria-hidden /> : null}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-[#eeeeee] bg-white"
          onClick={onExpensesCsv}
        >
          <Table className="size-4" aria-hidden />
          CSV — Gastos
          {!isPremium ? <Lock className="size-3.5" aria-hidden /> : null}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled
          title="Em breve"
          className="cursor-not-allowed gap-2 border-[#eeeeee] bg-[#f0f0f0] text-muted-foreground"
        >
          <FileText className="size-4" aria-hidden />
          Comprovante de renda
          <Badge variant="secondary" className="text-[10px]">
            Em breve
          </Badge>
        </Button>
      </section>

      {!hasRides ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-[#eeeeee] bg-white py-16 text-center shadow-sm">
          <FileX className="size-12 text-[#bbbbbb]" aria-hidden />
          <div>
            <p className="font-medium text-black">
              Nenhuma corrida registrada em {preview.monthLabel}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre corridas para ver seu relatório
            </p>
          </div>
          <RideFormDrawer vehicle={vehicle}>
            <Button type="button" className="bg-black text-white hover:bg-black/90">
              + Registrar corrida
            </Button>
          </RideFormDrawer>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Faturamento bruto"
              value={formatBRL(preview.gross)}
              deltaPct={dGross}
            />
            <KpiCard
              label="Total de gastos"
              value={formatBRL(preview.totalExpenses)}
              deltaPct={dExp}
              invertDelta
            />
            <KpiCard
              label="Lucro líquido"
              value={formatBRL(preview.netProfit)}
              deltaPct={dNet}
              emphasize
              valueClassName="text-[#00A651]"
            />
            <KpiCard
              label="Margem líquida"
              value={
                summary.indicadores.margemLiquidaPct != null
                  ? formatPercent(summary.indicadores.margemLiquidaPct)
                  : "—"
              }
              hideDelta
              subtext="sobre o faturamento bruto"
            />
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <EfficiencyStat
              label="Corridas"
              value={formatInt(preview.totalRides)}
            />
            <EfficiencyStat
              label="Lucro / hora"
              value={
                preview.netPerHour != null
                  ? `${formatBRL(preview.netPerHour)}/h`
                  : "—"
              }
            />
            <EfficiencyStat
              label="Custo / km"
              value={formatBRL(summary.eficienciaVeiculo.custoKmTotal)}
            />
            <EfficiencyStat
              label="Km rodados"
              value={formatKm(preview.totalKm)}
            />
            <EfficiencyStat
              label="Horas trabalhadas"
              value={formatHoras(summary.indicadores.horasTrabalhadas)}
            />
            <EfficiencyStat
              label="Dias trabalhados"
              value={`${formatInt(summary.indicadores.diasTrabalhados)} dias`}
            />
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-[#eeeeee] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-black">
                Corridas por plataforma
              </h2>
              <PlatformTable rows={summary.plataformas} />
            </div>
            <div className="rounded-lg border border-[#eeeeee] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-black">
                Gastos por categoria
              </h2>
              <ExpensesTable
                rows={summary.gastosPorCategoria}
                total={preview.totalExpenses}
              />
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-[#eeeeee] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-black">
                  Score por turno
                </h2>
                {!isPremium ? (
                  <Badge className="bg-black text-white hover:bg-black">
                    Premium
                  </Badge>
                ) : null}
              </div>
              <ShiftScoreTable rows={summary.turnos} blur={!isPremium} />
            </div>
            <GoalSummaryCard {...summary.metaDetalhe} />
          </section>

          <FuelVehicleCard
            abastecimentos={summary.abastecimentos}
            eficienciaVeiculo={summary.eficienciaVeiculo}
            manutencao={summary.manutencao}
          />

          <ExecutiveSummary
            roiOperacionalPct={summary.indicadores.roiOperacionalPct}
            ticketMedioLiquido={summary.indicadores.ticketMedioLiquido}
            rendaHoraBruta={summary.indicadores.rendaHoraBruta}
            rendaHoraLiquida={summary.indicadores.rendaHoraLiquida}
          />

          {summary.historicoDownloads.length > 0 ? (
            <div className="rounded-lg border border-[#eeeeee] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-black">
                Relatórios gerados
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#eeeeee] text-muted-foreground">
                      <th className="pb-2 font-medium">Período</th>
                      <th className="pb-2 font-medium">Gerado em</th>
                      <th className="pb-2 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.historicoDownloads.map((h) => {
                      const label = new Date(
                        Date.UTC(h.year, h.month - 1, 1),
                      ).toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      });
                      const cap = label.charAt(0).toUpperCase() + label.slice(1);
                      const gen = new Date(h.generatedAt).toLocaleString(
                        "pt-BR",
                        { dateStyle: "short", timeStyle: "short" },
                      );
                      return (
                        <tr
                          key={h.id}
                          className="border-b border-[#f6f6f6] last:border-0"
                        >
                          <td className="py-2 font-medium">{cap}</td>
                          <td className="py-2 text-muted-foreground">{gen}</td>
                          <td className="py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => onHistoricoPdf(h.month, h.year)}
                            >
                              <Download className="size-4" aria-hidden />
                              Baixar novamente
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Mostrando os 6 últimos downloads.
              </p>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disponível no Premium</DialogTitle>
            <DialogDescription>
              Exportação em PDF, CSV e score por turno completo fazem parte do
              plano Premium.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>
              Fechar
            </Button>
            <Button asChild className="bg-black text-white hover:bg-black/90">
              <Link href="/planos">Ver planos</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EfficiencyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#eeeeee] bg-white p-3 shadow-sm">
      <p className="text-xs text-[#777777]">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums text-black">
        {value}
      </p>
    </div>
  );
}
