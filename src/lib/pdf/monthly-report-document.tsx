import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { RelatorioMonthReport } from "@/lib/relatorio-month-preview";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica" },
  h1: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  sub: { fontSize: 8, color: "#555", marginBottom: 12 },
  row: { marginBottom: 4, flexDirection: "row" },
  label: { width: "48%", color: "#333" },
  value: { width: "52%", fontFamily: "Helvetica-Bold" },
  section: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 2,
  },
  tableRow: { flexDirection: "row", marginBottom: 3, fontSize: 8 },
  footer: { marginTop: 16, fontSize: 7, color: "#666" },
});

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

export function MonthlyReportDocument({ report }: { report: RelatorioMonthReport }) {
  const lines: { label: string; value: string }[] = [
    { label: "ID do relatório", value: report.reportId },
    { label: "Motorista", value: report.driverName },
    {
      label: "Veículo",
      value: report.vehicleLabel ?? "—",
    },
    { label: "Período", value: report.monthLabel },
    { label: "Corridas", value: String(report.totalRides) },
    {
      label: "Km rodados",
      value: `${report.totalKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`,
    },
    { label: "Faturamento bruto", value: brl.format(report.gross) },
    { label: "Total de gastos", value: brl.format(report.totalExpenses) },
    { label: "Lucro líquido (est.)", value: brl.format(report.netProfit) },
    {
      label: "Custo/km (combustível)",
      value: report.costPerKm > 0 ? brl.format(report.costPerKm) : "—",
    },
    {
      label: "Bruto / hora (est.)",
      value:
        report.grossPerHour != null ? brl.format(report.grossPerHour) : "—",
    },
    {
      label: "Líquido / hora (est.)",
      value: report.netPerHour != null ? brl.format(report.netPerHour) : "—",
    },
    {
      label: "Lucro líquido / km",
      value:
        report.totalKm > 0 ? brl.format(report.netPerKm) : "—",
    },
    {
      label: "Faturamento ÷ gastos",
      value:
        report.grossToExpensesRatio != null
          ? `${report.grossToExpensesRatio.toFixed(2)}×`
          : "—",
    },
    {
      label: "Eficiência (nota)",
      value: report.efficiencyGrade ?? "—",
    },
    { label: "Melhor plataforma", value: report.bestPlatform ?? "—" },
    { label: "Melhor dia", value: report.bestWeekdayLabel ?? "—" },
  ];

  if (report.goal) {
    lines.push(
      {
        label: "Meta mensal",
        value: brl.format(report.goal.monthlyTarget),
      },
      {
        label: "Progresso na meta",
        value: `${brl.format(report.goal.earnedTowardGoal)} (${report.goal.percentage.toFixed(1)}%)`,
      },
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Piloto — relatório mensal</Text>
        <Text style={styles.sub}>
          Gerado em {report.generatedAtLabel} · Confidencial
        </Text>
        {lines.map((l, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <Text style={styles.label}>{l.label}</Text>
            <Text style={styles.value}>{l.value}</Text>
          </View>
        ))}

        <Text style={styles.section}>Por plataforma</Text>
        {report.platformRows.length === 0 ? (
          <Text style={{ fontSize: 8, color: "#666" }}>
            Nenhuma corrida no período.
          </Text>
        ) : (
          report.platformRows.map((p) => (
            <View key={p.platform} style={styles.tableRow} wrap={false}>
              <Text style={{ width: "22%" }}>{p.platform}</Text>
              <Text style={{ width: "12%" }}>{p.rideCount} corr.</Text>
              <Text style={{ width: "22%" }}>{brl.format(p.gross)}</Text>
              <Text style={{ width: "22%" }}>Líq. {brl.format(p.netProfit)}</Text>
              <Text style={{ width: "22%" }}>
                {p.shareOfGrossPct.toFixed(0)}% fat.
              </Text>
            </View>
          ))
        )}

        <Text style={styles.section}>Turnos (lucro / h)</Text>
        {report.shiftRanking.map((s) => (
          <View key={s.label} style={styles.tableRow} wrap={false}>
            <Text style={{ width: "70%" }}>
              {s.rank}. {s.label}
            </Text>
            <Text style={{ width: "30%" }}>
              {s.profitPerHour > 0 ? brl.format(s.profitPerHour) : "—"}
            </Text>
          </View>
        ))}

        <Text style={styles.section}>Combustível no mês</Text>
        <View style={styles.row} wrap={false}>
          <Text style={styles.label}>Total litros</Text>
          <Text style={styles.value}>
            {report.fuel.totalLiters > 0
              ? `${report.fuel.totalLiters.toFixed(1)} L`
              : "—"}
          </Text>
        </View>
        <View style={styles.row} wrap={false}>
          <Text style={styles.label}>Custo combustível</Text>
          <Text style={styles.value}>{brl.format(report.fuel.totalFuelCost)}</Text>
        </View>

        <Text style={styles.footer}>Piloto — performance financeira para motoristas</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.section}>Gastos por categoria</Text>
        {report.expensesByCategory.length === 0 ? (
          <Text style={{ fontSize: 8 }}>Nenhum gasto.</Text>
        ) : (
          report.expensesByCategory.map((e) => (
            <View key={e.label} style={styles.row} wrap={false}>
              <Text style={styles.label}>{e.label}</Text>
              <Text style={styles.value}>{brl.format(e.amount)}</Text>
            </View>
          ))
        )}

        <Text style={styles.section}>Manutenção (status atual)</Text>
        {report.maintenance.length === 0 ? (
          <Text style={{ fontSize: 8 }}>Sem itens cadastrados.</Text>
        ) : (
          report.maintenance.map((m) => (
            <View key={m.type} style={styles.row} wrap={false}>
              <Text style={styles.label}>{m.type}</Text>
              <Text style={styles.value}>{m.label}</Text>
            </View>
          ))
        )}

        <View style={styles.row} wrap={false}>
          <Text style={styles.label}>Odômetro</Text>
          <Text style={styles.value}>
            {report.currentOdometer != null
              ? `${report.currentOdometer.toLocaleString("pt-BR")} km`
              : "—"}
          </Text>
        </View>

        <Text style={styles.section}>Melhores dias (lucro)</Text>
        {report.weekdayRanking.map((w) => (
          <View key={w.label} style={styles.row} wrap={false}>
            <Text style={styles.label}>
              {w.rank}. {w.label}
            </Text>
            <Text style={styles.value}>{brl.format(w.netProfit)}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Documento gerado automaticamente — {report.reportId}
        </Text>
      </Page>
    </Document>
  );
}
