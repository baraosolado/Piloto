/**
 * PDF mensal — layout “High-Performance Cockpit”
 * (equivalente ao gerador ReportLab em Python; marca Copilote).
 */
import type { ReactNode } from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  RelatorioMonthReport,
  RelatorioPlatformRow,
  RelatorioShiftRow,
} from "@/lib/relatorio-month-preview";
import { fuelVolumeUnitShort } from "@/lib/vehicle-powertrain";

const BLACK = "#000000";
const GREEN = "#006d33";
const WHITE = "#ffffff";
const SURFACE = "#f9f9f9";
const SURF_LOW = "#f3f3f3";
const SURF_CONT = "#eeeeee";
const SURF_HIGH = "#e8e8e8";
const ON_SURFACE = "#1a1c1c";
const GHOST = "#c6c6c6";
const PRIMARY_CONT = "#3b3b3b";
const PAD = 34;
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const styles = StyleSheet.create({
  page: {
    width: "100%",
    minHeight: "100%",
    backgroundColor: SURFACE,
    fontFamily: "Helvetica",
    color: ON_SURFACE,
  },
  hero: {
    width: "100%",
    height: 200,
    backgroundColor: BLACK,
    paddingTop: 22,
    paddingBottom: 16,
    alignItems: "center",
  },
  heroPeriod: {
    fontSize: 8,
    color: SURF_HIGH,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  heroProfit: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 8,
    color: SURF_CONT,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 18,
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: PAD,
  },
  chip: {
    backgroundColor: PRIMARY_CONT,
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  bodyPad: { paddingHorizontal: PAD, paddingTop: 14 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: WHITE,
    borderRadius: 6,
    padding: 10,
    minHeight: 78,
    justifyContent: "space-between",
  },
  kpiTitle: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY_CONT,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  kpiValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 4 },
  kpiValueGreen: { fontSize: 13, fontFamily: "Helvetica-Bold", color: GREEN },
  kpiNote: { fontSize: 5.5, color: PRIMARY_CONT, marginTop: 6 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  metricCell: {
    width: "31.5%",
    minWidth: 0,
    backgroundColor: SURF_LOW,
    borderRadius: 5,
    padding: 8,
    minHeight: 50,
    justifyContent: "space-between",
  },
  metricTitle: {
    fontSize: 5,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY_CONT,
    textTransform: "uppercase",
  },
  metricVal: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 4 },
  metricValGreen: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  sectionLine: {
    height: 0.5,
    backgroundColor: GHOST,
    marginBottom: 10,
  },
  tblHead: {
    flexDirection: "row",
    backgroundColor: BLACK,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  tblHeadCell: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    textTransform: "uppercase",
  },
  tblRow: {
    flexDirection: "row",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 4,
    alignItems: "center",
  },
  tblRowWhite: { backgroundColor: WHITE },
  tblRowAlt: { backgroundColor: SURF_LOW },
  tblCell: { fontSize: 7 },
  tblCellBold: { fontSize: 7, fontFamily: "Helvetica-Bold" },
  footerBar: {
    marginTop: 12,
    backgroundColor: BLACK,
    paddingVertical: 14,
    paddingHorizontal: PAD,
    alignItems: "center",
  },
  footerText: { fontSize: 6.5, color: SURF_HIGH, textAlign: "center" },
  p2TopBar: {
    width: "100%",
    height: 52,
    backgroundColor: BLACK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAD,
  },
  p2Brand: { fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE },
  p2Period: { fontSize: 7, color: SURF_CONT },
  progressTrack: {
    height: 20,
    backgroundColor: SURF_HIGH,
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: GREEN, borderRadius: 3 },
  metaMiniRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  goal3: { flexDirection: "row", gap: 10, marginBottom: 8 },
  goalCard: {
    flex: 1,
    backgroundColor: SURF_LOW,
    borderRadius: 5,
    padding: 8,
    minHeight: 54,
  },
  energyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  energyCell: {
    width: "48%",
    backgroundColor: WHITE,
    borderRadius: 4,
    padding: 8,
    minHeight: 44,
    borderWidth: 0.5,
    borderColor: SURF_CONT,
  },
  energyCellAlt: { backgroundColor: SURF_LOW },
  finCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 6,
    overflow: "hidden",
    minHeight: 68,
  },
  finCardTop: {
    backgroundColor: BLACK,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  finCardTopText: {
    fontSize: 5,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    textTransform: "uppercase",
  },
  finCardVal: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    padding: 10,
    paddingTop: 8,
  },
  finCardValGreen: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    padding: 10,
    paddingTop: 8,
  },
});

function brandHostFooter(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "Copilote";
  try {
    const u = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(u).host;
  } catch {
    return "Copilote";
  }
}

function formatHoursPt(h: number): string {
  if (!Number.isFinite(h) || h <= 0) return "0 h";
  return `${h.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

function formatKmPt(km: number): string {
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

function margemLiquidaPct(gross: number, net: number): string {
  if (gross <= 0) return "0,0%";
  return `${((net / gross) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function roiOperacional(net: number, expenses: number): string {
  if (expenses <= 0 || !Number.isFinite(net)) return "—";
  return `${((net / expenses) * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function splitShiftLabel(full: string): { name: string; hours: string } {
  const i = full.indexOf("(");
  if (i === -1) return { name: full, hours: "—" };
  return {
    name: full.slice(0, i).trim(),
    hours: full.slice(i + 1).replace(")", "").trim(),
  };
}

function daysInUtcMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function PdfFooterBar({ line }: { line: string }) {
  return (
    <View style={styles.footerBar}>
      <Text style={styles.footerText}>{line}</Text>
    </View>
  );
}

function KpiTrio({
  gross,
  expenses,
  net,
}: {
  gross: string;
  expenses: string;
  net: string;
}) {
  const note = "Dados do período selecionado";
  return (
    <View style={styles.kpiRow}>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiTitle}>Faturamento bruto</Text>
        <Text style={styles.kpiValue}>{gross}</Text>
        <Text style={styles.kpiNote}>{note}</Text>
      </View>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiTitle}>Total de gastos</Text>
        <Text style={styles.kpiValue}>{expenses}</Text>
        <Text style={styles.kpiNote}>{note}</Text>
      </View>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiTitle}>Lucro líquido</Text>
        <Text style={styles.kpiValueGreen}>{net}</Text>
        <Text style={styles.kpiNote}>{note}</Text>
      </View>
    </View>
  );
}

function MetricsGrid({
  cells,
}: {
  cells: { title: string; value: string; green?: boolean }[];
}) {
  return (
    <View style={styles.metricGrid}>
      {cells.map((c, i) => (
        <View key={i} style={styles.metricCell}>
          <Text style={styles.metricTitle}>{c.title}</Text>
          <Text style={c.green ? styles.metricValGreen : styles.metricVal}>
            {c.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
      {children}
    </View>
  );
}

function TableBlackHeader({
  cols,
  widthsPct,
}: {
  cols: string[];
  widthsPct: number[];
}) {
  return (
    <View style={styles.tblHead}>
      {cols.map((col, i) => (
        <Text
          key={col}
          style={[styles.tblHeadCell, { width: `${widthsPct[i]}%` }]}
        >
          {col}
        </Text>
      ))}
    </View>
  );
}

function PlatformRows({
  rows,
  bestName,
}: {
  rows: RelatorioPlatformRow[];
  bestName: string | null;
}) {
  if (rows.length === 0) {
    return (
      <Text style={{ fontSize: 8, color: PRIMARY_CONT, marginBottom: 8 }}>
        Nenhuma corrida no período.
      </Text>
    );
  }
  return rows.map((p, idx) => {
    const star = bestName && p.platform === bestName ? " ★" : "";
    return (
      <View
        key={p.platform}
        style={[
          styles.tblRow,
          idx % 2 === 0 ? styles.tblRowWhite : styles.tblRowAlt,
        ]}
        wrap={false}
      >
        <Text style={[styles.tblCellBold, { width: "22%" }]}>
          {p.platform}
          {star}
        </Text>
        <Text style={[styles.tblCell, { width: "12%" }]}>{p.rideCount}</Text>
        <Text style={[styles.tblCell, { width: "22%" }]}>
          {brl.format(p.gross)}
        </Text>
        <Text style={[styles.tblCell, { width: "22%" }]}>
          {brl.format(p.netProfit)}
        </Text>
        <Text
          style={[
            styles.tblCell,
            { width: "22%", fontFamily: "Helvetica-Bold", color: GREEN },
          ]}
        >
          {p.profitPerHour > 0 ? `${brl.format(p.profitPerHour)}/h` : "—"}
        </Text>
      </View>
    );
  });
}

function ShiftRows({ rows }: { rows: RelatorioShiftRow[] }) {
  return rows.map((s, idx) => {
    const { name, hours } = splitShiftLabel(s.label);
    const rankLabel = `${s.rank}º`;
    return (
      <View
        key={s.label}
        style={[
          styles.tblRow,
          idx % 2 === 0 ? styles.tblRowWhite : styles.tblRowAlt,
        ]}
        wrap={false}
      >
        <Text style={[styles.tblCellBold, { width: "26%" }]}>{name}</Text>
        <Text style={[styles.tblCell, { width: "28%" }]}>{hours}</Text>
        <Text style={[styles.tblCell, { width: "28%", color: GREEN }]}>
          {s.profitPerHour > 0 ? `${brl.format(s.profitPerHour)}/h` : "—"}
        </Text>
        <Text style={[styles.tblCellBold, { width: "18%" }]}>{rankLabel}</Text>
      </View>
    );
  });
}

export function MonthlyReportDocument({
  report,
}: {
  report: RelatorioMonthReport;
}) {
  const isEv = report.fuel.powertrain === "electric";
  const volUnit = fuelVolumeUnitShort(report.fuel.powertrain);
  const periodUpper = report.monthLabel.toUpperCase();
  const marginPct = margemLiquidaPct(report.gross, report.netProfit);
  const ticketStr =
    report.ticketMedioLiquido != null
      ? brl.format(report.ticketMedioLiquido)
      : "—";
  const ticketLine =
    report.ticketMedioLiquido != null
      ? `${brl.format(report.ticketMedioLiquido)} por corrida`
      : "—";

  const fuelVolStr =
    report.fuel.totalLiters > 0
      ? `${report.fuel.totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${volUnit}`
      : "—";
  const fuelPriceUnit =
    report.fuel.totalLiters > 0 && report.fuel.totalFuelCost >= 0
      ? brl.format(report.fuel.totalFuelCost / report.fuel.totalLiters)
      : "—";
  const fuelCostPerKmEnergy =
    report.totalKm > 0 && report.fuel.totalFuelCost > 0
      ? brl.format(report.fuel.totalFuelCost / report.totalKm)
      : "—";

  const goal = report.goal;
  const dim =
    report.periodMetaDays ?? daysInUtcMonth(report.year, report.month);
  const metaDiaria =
    goal != null
      ? brl.format(goal.monthlyTarget / dim)
      : "—";
  const faltamMeta =
    goal != null
      ? brl.format(Math.max(0, goal.monthlyTarget - goal.earnedTowardGoal))
      : "—";
  const metaPctFill = goal != null ? Math.min(100, goal.percentage) : 0;

  const maintSpend =
    report.expensesByCategory.find((e) => e.label === "Manutenção")
      ?.amount ?? 0;
  const maintStr = brl.format(maintSpend);

  const docTitle = `Copilote — ${report.monthLabel}`;

  const metricsCells = [
    {
      title: "Lucro / hora",
      value: report.netPerHour != null ? `${brl.format(report.netPerHour)}/h` : "—",
      green: true,
    },
    { title: "Km rodados", value: formatKmPt(report.totalKm) },
    {
      title: "Dias trabalhados",
      value: `${report.workDays} ${report.workDays === 1 ? "dia" : "dias"}`,
    },
    {
      title: "Custo / km",
      value: report.costPerKm > 0 ? brl.format(report.costPerKm) : "—",
    },
    { title: "Horas trabalhadas", value: formatHoursPt(report.workHours) },
    { title: "Ticket médio", value: ticketStr },
  ];

  const energyTitle = isEv ? "Energia e veículo" : "Combustível e veículo";
  const volLabel = isEv ? "Total (kWh)" : "Total (L)";
  const priceLabel = isEv ? "Preço médio/kWh" : "Preço médio/L";
  const ckmEnergyLabel = isEv ? "Custo/km (energia)" : "Custo/km (combustível)";

  const energyPairs: [string, string][][] = [
    [
      [volLabel, fuelVolStr],
      ["Total gasto", brl.format(report.fuel.totalFuelCost)],
    ],
    [
      [priceLabel, fuelPriceUnit],
      [ckmEnergyLabel, fuelCostPerKmEnergy],
    ],
    [
      ["Custo/km total", brl.format(report.costPerKm)],
      ["Gasto manutenção (cat.)", maintStr],
    ],
    [
      ["Consumo médio", report.fuel.avgConsumptionKmL != null ? `${report.fuel.avgConsumptionKmL} km/${volUnit}` : "—"],
      ["ROI operacional", roiOperacional(report.netProfit, report.totalExpenses)],
    ],
  ];

  return (
    <Document
      title={docTitle}
      author="Copilote"
      subject="Relatório mensal — Cockpit"
      creator="Copilote"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.heroPeriod}>
            RELATÓRIO MENSAL · {periodUpper}
          </Text>
          <Text style={styles.heroProfit}>{brl.format(report.netProfit)}</Text>
          <Text style={styles.heroSub}>Lucro líquido do período</Text>
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {report.totalRides}{" "}
                {report.totalRides === 1 ? "corrida" : "corridas"}
              </Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{marginPct} margem</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {formatHoursPt(report.workHours)} trabalhadas
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bodyPad}>
          <KpiTrio
            gross={brl.format(report.gross)}
            expenses={brl.format(report.totalExpenses)}
            net={brl.format(report.netProfit)}
          />

          <MetricsGrid cells={metricsCells} />

          <SectionBlock title="Corridas por plataforma">
            <TableBlackHeader
              cols={["Plataforma", "Corridas", "Faturamento", "Lucro líq.", "Lucro/hora"]}
              widthsPct={[22, 12, 22, 22, 22]}
            />
            <PlatformRows
              rows={report.platformRows}
              bestName={report.bestPlatform}
            />
          </SectionBlock>

          <SectionBlock title="Score por turno">
            <TableBlackHeader
              cols={["Turno", "Horário", "Lucro/hora", "Ranking"]}
              widthsPct={[26, 28, 28, 18]}
            />
            <ShiftRows rows={report.shiftRanking} />
          </SectionBlock>
        </View>

        <PdfFooterBar
          line={`Gerado automaticamente · ${report.monthLabel} · Copilote · ${brandHostFooter()}`}
        />
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.p2TopBar}>
          <Text style={styles.p2Brand}>COPILOTE · COCKPIT FINANCEIRO</Text>
          <Text style={styles.p2Period}>{report.monthLabel}</Text>
        </View>

        <View style={styles.bodyPad}>
          <SectionBlock title="Meta do mês">
            {goal ? (
              <>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${metaPctFill}%` }]}
                  />
                </View>
                <View style={styles.metaMiniRow}>
                  <Text style={{ fontSize: 6.5, color: PRIMARY_CONT }}>
                    {goal.percentage.toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })}
                    % concluído
                  </Text>
                  <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold" }}>
                    Meta: {brl.format(goal.monthlyTarget)}
                  </Text>
                </View>
                <View style={styles.goal3}>
                  <View style={styles.goalCard}>
                    <Text style={styles.metricTitle}>Meta diária (média)</Text>
                    <Text style={styles.metricVal}>{metaDiaria}</Text>
                  </View>
                  <View style={styles.goalCard}>
                    <Text style={styles.metricTitle}>Melhor dia</Text>
                    <Text style={styles.metricVal}>
                      {report.bestWeekdayLabel ?? "—"}
                    </Text>
                  </View>
                  <View style={styles.goalCard}>
                    <Text style={styles.metricTitle}>Pior dia</Text>
                    <Text style={styles.metricVal}>
                      {report.worstWeekdayLabel ?? "—"}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 6.5, color: GREEN, fontFamily: "Helvetica-Bold" }}>
                  Faltam {faltamMeta} para atingir a meta
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 8, color: PRIMARY_CONT }}>
                Nenhuma meta mensal configurada para este período.
              </Text>
            )}
          </SectionBlock>

          <SectionBlock title={energyTitle}>
            <View style={styles.energyGrid}>
              {energyPairs.flatMap((pair, ri) =>
                pair.map(([title, val], ci) => (
                  <View
                    key={`${ri}-${ci}-${title}`}
                    style={[
                      styles.energyCell,
                      (ri + ci) % 2 === 1 ? styles.energyCellAlt : {},
                    ]}
                  >
                    <Text style={styles.metricTitle}>{title}</Text>
                    <Text style={styles.metricVal}>{val}</Text>
                  </View>
                )),
              )}
            </View>
          </SectionBlock>

          <SectionBlock title="Resumo financeiro final">
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={styles.finCard}>
                <View style={styles.finCardTop}>
                  <Text style={styles.finCardTopText}>Ticket méd. líquido</Text>
                </View>
                <Text style={styles.finCardVal}>{ticketLine}</Text>
              </View>
              <View style={styles.finCard}>
                <View style={styles.finCardTop}>
                  <Text style={styles.finCardTopText}>Renda bruta/hora</Text>
                </View>
                <Text style={styles.finCardVal}>
                  {report.grossPerHour != null
                    ? `${brl.format(report.grossPerHour)}/h`
                    : "—"}
                </Text>
              </View>
              <View style={styles.finCard}>
                <View style={styles.finCardTop}>
                  <Text style={styles.finCardTopText}>Renda líquida/hora</Text>
                </View>
                <Text style={styles.finCardValGreen}>
                  {report.netPerHour != null
                    ? `${brl.format(report.netPerHour)}/h`
                    : "—"}
                </Text>
              </View>
            </View>
          </SectionBlock>

          <SectionBlock title="Gastos por categoria">
            {report.expensesByCategory.length === 0 ? (
              <Text style={{ fontSize: 8, color: PRIMARY_CONT }}>
                Nenhum gasto registrado neste período.
              </Text>
            ) : (
              report.expensesByCategory.slice(0, 12).map((e, i) => (
                <View
                  key={e.label}
                  style={[
                    styles.tblRow,
                    i % 2 === 0 ? styles.tblRowWhite : styles.tblRowAlt,
                    { paddingVertical: 6 },
                  ]}
                  wrap={false}
                >
                  <Text style={[styles.tblCellBold, { width: "55%" }]}>
                    {e.label}
                  </Text>
                  <Text style={[styles.tblCell, { width: "45%" }]}>
                    {brl.format(e.amount)}
                  </Text>
                </View>
              ))
            )}
          </SectionBlock>

          <Text style={{ fontSize: 6.5, color: GHOST, marginTop: 4 }}>
            {report.reportId} · {report.driverName}
            {report.vehicleLabel ? ` · ${report.vehicleLabel}` : ""} ·{" "}
            {report.generatedAtLabel}
          </Text>
        </View>

        <PdfFooterBar
          line={`Gerado automaticamente · ${report.monthLabel} · Copilote · ${brandHostFooter()}`}
        />
      </Page>
    </Document>
  );
}
