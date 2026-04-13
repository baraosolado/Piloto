"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  FileX,
  Gauge,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { RideFormDrawer } from "@/components/rides/ride-form-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { MAX_REPORT_RANGE_DAYS } from "@/lib/report-range-constants";
import type { SerializedReportsSummary } from "@/lib/reports-summary";
import { cn } from "@/lib/utils";
import { ExecutiveSummary } from "./executive-summary";
import { ExpensesTable } from "./expenses-table";
import { FuelVehicleCard } from "./fuel-vehicle-card";
import { GoalSummaryCard } from "./goal-summary-card";
import { KpiCard } from "./kpi-card";
import { PlatformTable } from "./platform-table";
import { ShiftScoreTable } from "./shift-score-table";

export type RelatoriosPeriod =
  | { kind: "month"; month: number; year: number }
  | { kind: "range"; from: string; to: string };

function buildReportQuery(period: RelatoriosPeriod): string {
  if (period.kind === "month") {
    return `month=${period.month}&year=${period.year}`;
  }
  return `from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}`;
}

function inclusiveDaysIsoUtc(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  if (
    ![fy, fm, fd, ty, tm, td].every((n) => Number.isInteger(n) && n > 0) ||
    fm > 12 ||
    tm > 12
  ) {
    return 0;
  }
  const t0 = Date.UTC(fy, fm - 1, fd);
  const t1 = Date.UTC(ty, tm - 1, td);
  if (t1 < t0) return 0;
  return Math.round((t1 - t0) / 86400000) + 1;
}

function isoMonthBoundsUtc(year: number, month: number): {
  from: string;
  to: string;
} {
  const a = new Date(Date.UTC(year, month - 1, 1));
  const b = new Date(Date.UTC(year, month, 0));
  const f = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { from: f(a), to: f(b) };
}

function monthLabelUtc(month1to12: number, year: number): string {
  const raw = new Date(Date.UTC(year, month1to12 - 1, 15)).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Últimos 12 meses no calendário UTC (alinhado a `month`/`year` da URL e às corridas). */
function buildLast12UtcMonths(): { month: number; year: number; label: string }[] {
  const out: { month: number; year: number; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    const month = d.getUTCMonth() + 1;
    const year = d.getUTCFullYear();
    out.push({ month, year, label: monthLabelUtc(month, year) });
  }
  return out;
}

/** Garante que o mês atual da página existe no Select (Radix exige `value` ∈ itens). */
function ensureMonthInOptions(
  options: { month: number; year: number; label: string }[],
  month: number,
  year: number,
): { month: number; year: number; label: string }[] {
  if (options.some((o) => o.month === month && o.year === year)) {
    return options;
  }
  const merged = [
    ...options,
    { month, year, label: monthLabelUtc(month, year) },
  ];
  merged.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
  return merged;
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
  period: RelatoriosPeriod;
  summary: SerializedReportsSummary;
  isPremium: boolean;
  vehicle: Vehicle | null;
};

export function RelatoriosClient({
  period,
  summary,
  isPremium,
  vehicle,
}: Props) {
  const router = useRouter();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { preview, periodoAnterior, hasRides } = summary;
  const q = useMemo(() => buildReportQuery(period), [period]);

  const monthOptions = useMemo(() => {
    const base = buildLast12UtcMonths();
    if (period.kind === "month") {
      return ensureMonthInOptions(base, period.month, period.year);
    }
    return base;
  }, [period]);
  const selectValue =
    period.kind === "month" ? `${period.month}-${period.year}` : "";

  const openUpgrade = () => setUpgradeOpen(true);

  const openCustomRangeDialog = () => {
    if (period.kind === "range") {
      setCustomFrom(period.from);
      setCustomTo(period.to);
    } else {
      const b = isoMonthBoundsUtc(period.year, period.month);
      setCustomFrom(b.from);
      setCustomTo(b.to);
    }
    setCustomRangeOpen(true);
  };

  const applyCustomRange = () => {
    const a = customFrom.trim();
    const b = customTo.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
      toast.error("Use o formato AAAA-MM-DD em ambas as datas.");
      return;
    }
    if (a > b) {
      toast.error("A data inicial não pode ser depois da final.");
      return;
    }
    const span = inclusiveDaysIsoUtc(a, b);
    if (span <= 0) {
      toast.error("Datas inválidas.");
      return;
    }
    if (span > MAX_REPORT_RANGE_DAYS) {
      toast.error(`Período máximo: ${MAX_REPORT_RANGE_DAYS} dias (UTC).`);
      return;
    }
    setCustomRangeOpen(false);
    router.push(
      `/relatorios?from=${encodeURIComponent(a)}&to=${encodeURIComponent(b)}`,
    );
  };

  const onPdf = async () => {
    if (!isPremium) {
      openUpgrade();
      return;
    }
    setPdfLoading(true);
    try {
      const fallbackPdf =
        period.kind === "month"
          ? `copilote-relatorio-${period.year}-${String(period.month).padStart(2, "0")}.pdf`
          : `copilote-relatorio-${period.from}_a_${period.to}.pdf`;
      await downloadBlob(`/api/reports/pdf?${q}`, fallbackPdf);
      toast.success("PDF baixado.");
      router.refresh();
    } catch {
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setPdfLoading(false);
    }
  };

  const onExcel = async () => {
    if (!isPremium) {
      openUpgrade();
      return;
    }
    setExcelLoading(true);
    try {
      const fallbackXlsx =
        period.kind === "month"
          ? `copilote-relatorio-${period.year}-${String(period.month).padStart(2, "0")}.xlsx`
          : `copilote-relatorio-${period.from}_a_${period.to}.xlsx`;
      await downloadBlob(`/api/reports/excel?${q}`, fallbackXlsx);
      toast.success("Excel baixado.");
      router.refresh();
    } catch {
      toast.error("Erro ao gerar o Excel. Tente novamente.");
    } finally {
      setExcelLoading(false);
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
        `copilote-relatorio-${y}-${String(m).padStart(2, "0")}.pdf`,
      );
    } catch {
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    }
  };

  const onHistoricoExcel = async (m: number, y: number) => {
    if (!isPremium) {
      openUpgrade();
      return;
    }
    try {
      await downloadBlob(
        `/api/reports/excel?month=${m}&year=${y}`,
        `copilote-relatorio-${y}-${String(m).padStart(2, "0")}.xlsx`,
      );
    } catch {
      toast.error("Erro ao gerar o Excel. Tente novamente.");
    }
  };

  const periodUpper = preview.monthLabel.toUpperCase();
  const margemChip =
    summary.indicadores.margemLiquidaPct != null
      ? `${formatPercent(summary.indicadores.margemLiquidaPct)} margem`
      : "0,0% margem";

  return (
    <div className="overflow-hidden rounded-2xl border border-black/15 bg-[#f9f9f9] shadow-[0_16px_50px_-24px_rgba(0,0,0,0.25)]">
      <section className="bg-black px-4 pb-7 pt-9 text-center sm:px-6 sm:pb-8 sm:pt-10">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#e8e8e8] sm:text-[11px]">
          Relatório · {periodUpper}
        </p>
        <p className="mt-3 font-black tabular-nums text-[#006d33] text-[2.1rem] leading-none sm:text-5xl">
          {formatBRL(preview.netProfit)}
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#eeeeee]">
          Lucro líquido do período
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-[#3b3b3b] px-3 py-2 text-[11px] font-bold text-white">
            {formatInt(preview.totalRides)}{" "}
            {preview.totalRides === 1 ? "corrida" : "corridas"}
          </span>
          <span className="rounded-full bg-[#3b3b3b] px-3 py-2 text-[11px] font-bold text-white">
            {margemChip}
          </span>
          <span className="rounded-full bg-[#3b3b3b] px-3 py-2 text-[11px] font-bold text-white">
            {formatHoras(summary.indicadores.horasTrabalhadas)} trabalhadas
          </span>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            disabled={!isPremium || pdfLoading}
            title={!isPremium ? "Disponível no Premium" : undefined}
            variant="outline"
            className="h-10 gap-2 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white disabled:opacity-50"
            onClick={onPdf}
          >
            {!isPremium ? (
              <Lock className="size-4" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            Baixar PDF
          </Button>
          <Button
            type="button"
            disabled={!isPremium || excelLoading}
            title={!isPremium ? "Disponível no Premium" : undefined}
            variant="outline"
            className="h-10 gap-2 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white disabled:opacity-50"
            onClick={onExcel}
          >
            {!isPremium ? (
              <Lock className="size-4" aria-hidden />
            ) : (
              <FileSpreadsheet className="size-4" aria-hidden />
            )}
            Baixar Excel
          </Button>
          {!isPremium ? (
            <Badge className="border border-white/30 bg-white/10 text-[10px] font-bold uppercase tracking-wide text-white">
              Premium
            </Badge>
          ) : null}
        </div>
      </section>

      <section className="border-t border-white/10 bg-white px-4 py-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gauge className="size-5 text-[#006d33]" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1a1c1c]">
              Período e exportação
            </span>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {period.kind === "month" ? (
            <Select
              value={selectValue}
              onValueChange={(v) => {
                const [m, y] = v.split("-").map(Number);
                router.push(`/relatorios?month=${m}&year=${y}`);
              }}
            >
              <SelectTrigger className="h-11 w-[220px] border-black/20 bg-[#f9f9f9] font-medium">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((o) => (
                  <SelectItem
                    key={`${o.month}-${o.year}`}
                    value={`${o.month}-${o.year}`}
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex min-h-11 min-w-[220px] flex-col justify-center gap-1 rounded-md border border-black/20 bg-[#f9f9f9] px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#3b3b3b]">
                Período (UTC)
              </span>
              <span className="text-sm font-semibold text-[#1a1c1c]">
                {period.from} → {period.to}
              </span>
              <Button
                type="button"
                variant="link"
                className="h-auto self-start p-0 text-xs text-[#006d33]"
                onClick={() =>
                  router.push(
                    `/relatorios?month=${preview.month}&year=${preview.year}`,
                  )
                }
              >
                Exibir mês completo (UTC {preview.month}/{preview.year})
              </Button>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 border-black/20 bg-[#f9f9f9] hover:bg-[#f0f0f0]"
            onClick={openCustomRangeDialog}
          >
            <CalendarRange className="size-4 shrink-0" aria-hidden />
            Período customizado
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-2 border-black/20 bg-[#f9f9f9] hover:bg-[#f0f0f0]"
            onClick={onPdf}
          >
            <FileDown className="size-4" aria-hidden />
            PDF completo
            {!isPremium ? (
              <Lock className="size-3.5 shrink-0" aria-hidden />
            ) : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-2 border-black/20 bg-[#f9f9f9] hover:bg-[#f0f0f0]"
            onClick={onExcel}
          >
            <FileSpreadsheet className="size-4" aria-hidden />
            Excel (Power BI)
            {!isPremium ? (
              <Lock className="size-3.5 shrink-0" aria-hidden />
            ) : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled
            title="Em breve"
            className="h-10 cursor-not-allowed gap-2 border-dashed border-black/20 bg-muted/40 text-muted-foreground"
          >
            <FileText className="size-4" aria-hidden />
            Comprovante
            <Badge variant="secondary" className="text-[10px]">
              Em breve
            </Badge>
          </Button>
        </div>
      </section>

      {!hasRides ? (
        <div className="border-t border-black/5 bg-[#f9f9f9] px-4 py-14 text-center sm:px-6">
          <FileX
            className="mx-auto size-12 text-[#006d33]/40"
            aria-hidden
          />
          <p className="mt-4 font-bold text-[#1a1c1c]">
            Nenhum dia registrado em {preview.monthLabel}
          </p>
          <p className="mt-2 text-sm text-[#3b3b3b]">
            Registre o resumo do dia em Corridas para ver o cockpit completo e
            exportações.
          </p>
          <div className="mt-6">
            <RideFormDrawer vehicle={vehicle}>
              <Button
                type="button"
                className="bg-[#006d33] text-white hover:bg-[#006d33]/90"
              >
                Registrar dia
              </Button>
            </RideFormDrawer>
          </div>
        </div>
      ) : (
        <div className="space-y-5 border-t border-black/5 p-4 sm:p-6">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              cockpit
              label="Faturamento bruto"
              value={formatBRL(preview.gross)}
            />
            <KpiCard
              cockpit
              label="Total de gastos"
              value={formatBRL(preview.totalExpenses)}
            />
            <KpiCard
              cockpit
              emphasize
              label="Lucro líquido"
              value={formatBRL(preview.netProfit)}
            />
          </section>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:gap-3">
            <CockpitMetric
              label="Lucro / hora"
              green
              value={
                preview.netPerHour != null
                  ? `${formatBRL(preview.netPerHour)}/h`
                  : "—"
              }
            />
            <CockpitMetric
              label="Km rodados"
              value={formatKm(preview.totalKm)}
            />
            <CockpitMetric
              label="Dias trabalhados"
              value={`${formatInt(summary.indicadores.diasTrabalhados)} dias`}
            />
            <CockpitMetric
              label="Custo / km"
              value={formatBRL(summary.eficienciaVeiculo.custoKmTotal)}
            />
            <CockpitMetric
              label="Horas trabalhadas"
              value={formatHoras(summary.indicadores.horasTrabalhadas)}
            />
            <CockpitMetric
              label="Ticket médio"
              value={
                summary.indicadores.ticketMedioLiquido != null
                  ? formatBRL(summary.indicadores.ticketMedioLiquido)
                  : "—"
              }
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CockpitBlock title="Corridas por plataforma">
              <PlatformTable visual="cockpit" rows={summary.plataformas} />
            </CockpitBlock>
            <CockpitBlock title="Gastos por categoria">
              <ExpensesTable
                visual="cockpit"
                rows={summary.gastosPorCategoria}
                total={preview.totalExpenses}
              />
            </CockpitBlock>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CockpitBlock
              title="Score por turno"
              action={
                !isPremium ? (
                  <Badge className="shrink-0 bg-black text-white hover:bg-black">
                    Premium
                  </Badge>
                ) : null
              }
            >
              <ShiftScoreTable
                visual="cockpit"
                rows={summary.turnos}
                blur={!isPremium}
              />
            </CockpitBlock>
            <GoalSummaryCard visual="cockpit" {...summary.metaDetalhe} />
          </div>

          <FuelVehicleCard
            visual="cockpit"
            powertrain={summary.vehiclePowertrain}
            abastecimentos={summary.abastecimentos}
            eficienciaVeiculo={summary.eficienciaVeiculo}
            manutencao={summary.manutencao}
          />

          <CockpitBlock title="Resumo financeiro final">
            <ExecutiveSummary
              visual="cockpit"
              roiOperacionalPct={summary.indicadores.roiOperacionalPct}
              ticketMedioLiquido={summary.indicadores.ticketMedioLiquido}
              rendaHoraBruta={summary.indicadores.rendaHoraBruta}
              rendaHoraLiquida={summary.indicadores.rendaHoraLiquida}
            />
            {summary.indicadores.roiOperacionalPct != null ? (
              <p className="mt-3 text-center text-xs text-[#3b3b3b]">
                ROI operacional:{" "}
                <span className="font-bold text-[#1a1c1c]">
                  {formatPercent(summary.indicadores.roiOperacionalPct)}
                </span>
              </p>
            ) : null}
          </CockpitBlock>

          {summary.historicoDownloads.length > 0 ? (
            <CockpitBlock title="Relatórios gerados">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="bg-black text-white">
                      <th className="rounded-tl-md px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider">
                        Gerado em
                      </th>
                      <th className="rounded-tr-md px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.historicoDownloads.map((h, idx) => {
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
                          className={cn(
                            "border-0",
                            idx % 2 === 1 ? "bg-[#f3f3f3]" : "bg-white",
                          )}
                        >
                          <td className="px-3 py-2.5 font-medium text-[#1a1c1c]">
                            {cap}
                          </td>
                          <td className="px-3 py-2.5 text-[#3b3b3b]">{gen}</td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-[#006d33] hover:text-[#006d33]"
                                onClick={() => onHistoricoPdf(h.month, h.year)}
                              >
                                <Download className="size-4" aria-hidden />
                                PDF
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-[#006d33] hover:text-[#006d33]"
                                onClick={() => onHistoricoExcel(h.month, h.year)}
                              >
                                <FileSpreadsheet className="size-4" aria-hidden />
                                Excel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-center text-[11px] text-[#5c5c5c]">
                Últimos 6 downloads · PDF ou Excel (aba Dados_PowerBI)
              </p>
            </CockpitBlock>
          ) : null}
        </div>
      )}

      <div className="bg-black px-4 py-3 text-center">
        <p className="text-[11px] text-[#e8e8e8]">
          Copilote · {preview.monthLabel} · cockpit financeiro
        </p>
      </div>

      <Dialog open={customRangeOpen} onOpenChange={setCustomRangeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Período customizado</DialogTitle>
            <DialogDescription>
              Informe início e fim em UTC (mesmo critério das corridas). Máximo
              de {MAX_REPORT_RANGE_DAYS} dias.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="rel-from">De (AAAA-MM-DD)</Label>
              <Input
                id="rel-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border-black/20 bg-[#f9f9f9]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rel-to">Até (AAAA-MM-DD)</Label>
              <Input
                id="rel-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border-black/20 bg-[#f9f9f9]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomRangeOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#006d33] text-white hover:bg-[#006d33]/90"
              onClick={applyCustomRange}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disponível no Premium</DialogTitle>
            <DialogDescription>
              Exportação em PDF, Excel (inclui dados para Power BI) e score por
              turno completo fazem parte do plano Premium.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>
              Fechar
            </Button>
            <Button asChild className="bg-black text-white hover:bg-black/90">
              <Link href="/configuracoes/plano">Plano e pagamento</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CockpitBlock({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#1a1c1c]">
          {title}
        </h2>
        {action}
      </div>
      <div className="mb-3 mt-2 h-px bg-[#c6c6c6]" />
      {children}
    </div>
  );
}

function CockpitMetric({
  label,
  value,
  green,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="flex min-h-[52px] flex-col justify-between rounded-md bg-[#f3f3f3] p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#3b3b3b]">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-black tabular-nums text-[#1a1c1c]",
          green && "text-[#006d33]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
