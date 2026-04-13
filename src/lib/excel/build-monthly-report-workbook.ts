/**
 * Relatório mensal .xlsx — estilo cockpit (equivalente ao layout Python/openpyxl).
 * Marca: Copilote. Aba extra “Dados_PowerBI” para importação em tabelas.
 */
import ExcelJS from "exceljs";
import type { RelatorioMonthReport } from "@/lib/relatorio-month-preview";
import { fuelVolumeUnitShort } from "@/lib/vehicle-powertrain";

const BLK = "FF000000";
const GRN = "FF006D33";
const WHT = "FFFFFFFF";
const SURF = "FFF9F9F9";
const SLOW = "FFF3F3F3";
const SCNT = "FFEEEEEE";
const ONSF = "FF1A1C1C";
const PCNT = "FF3B3B3B";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

function brlN(n: number): string {
  return brl.format(n);
}

function formatHoursPt(h: number): string {
  if (!Number.isFinite(h) || h <= 0) return "0 h";
  return `${h.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

function formatKmPt(km: number): string {
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

function margemPct(gross: number, net: number): string {
  if (gross <= 0) return "0,0%";
  return `${((net / gross) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function roiStr(net: number, expenses: number): string {
  if (expenses <= 0 || !Number.isFinite(net)) return "—";
  return `${((net / expenses) * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function splitShift(full: string): { name: string; hours: string } {
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

function solidFill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function mergeStyle(
  ws: ExcelJS.Worksheet,
  row: number,
  colStart: number,
  colEnd: number,
  value: string | number,
  opt: {
    bg: string;
    fg: string;
    size?: number;
    bold?: boolean;
    hAlign?: "left" | "center" | "right";
    height?: number;
  },
): void {
  if (colEnd > colStart) {
    ws.mergeCells(row, colStart, row, colEnd);
  }
  const r = ws.getRow(row);
  for (let c = colStart; c <= colEnd; c++) {
    const cell = r.getCell(c);
    if (c === colStart) cell.value = value;
    cell.fill = solidFill(opt.bg);
    cell.font = {
      name: "Calibri",
      size: opt.size ?? 10,
      bold: opt.bold ?? false,
      color: { argb: opt.fg },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: opt.hAlign ?? "left",
      wrapText: false,
    };
  }
  if (opt.height) r.height = opt.height;
}

function paintRow(ws: ExcelJS.Worksheet, row: number, c1: number, c2: number, argb: string): void {
  const r = ws.getRow(row);
  for (let c = c1; c <= c2; c++) {
    r.getCell(c).fill = solidFill(argb);
  }
}

function setColWidths(ws: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

function buildDashboard(ws: ExcelJS.Worksheet, rep: RelatorioMonthReport): void {
  setColWidths(ws, [2, 22, 18, 22, 18, 22, 18, 2]);
  let r = 1;
  paintRow(ws, r, 1, 8, GRN);
  ws.getRow(r).height = 6;
  r++;

  for (let i = 0; i < 4; i++) {
    paintRow(ws, r + i, 1, 8, BLK);
    ws.getRow(r + i).height = 18;
  }
  mergeStyle(ws, r, 2, 7, "COPILOTE · COCKPIT FINANCEIRO", {
    bg: BLK,
    fg: PCNT,
    size: 8,
    bold: true,
    hAlign: "left",
  });
  mergeStyle(ws, r + 1, 2, 7, `RELATÓRIO MENSAL  ·  ${rep.monthLabel.toUpperCase()}`, {
    bg: BLK,
    fg: "FFAAAAAA",
    size: 9,
    hAlign: "center",
  });
  mergeStyle(ws, r + 2, 2, 7, brlN(rep.netProfit), {
    bg: BLK,
    fg: GRN,
    size: 26,
    bold: true,
    hAlign: "center",
    height: 38,
  });
  mergeStyle(ws, r + 3, 2, 7, "LUCRO LÍQUIDO DO PERÍODO", {
    bg: BLK,
    fg: SCNT,
    size: 8,
    hAlign: "center",
  });
  r += 4;

  paintRow(ws, r, 1, 8, SURF);
  ws.getRow(r).height = 10;
  r++;

  const note = "Dados do período selecionado";
  const kpis: [string, string, string, string][] = [
    ["FATURAMENTO BRUTO", brlN(rep.gross), note, GRN],
    ["TOTAL DE GASTOS", brlN(rep.totalExpenses), note, ONSF],
    ["LUCRO LÍQUIDO", brlN(rep.netProfit), note, GRN],
  ];
  const kpiCols: [number, number][] = [
    [2, 3],
    [4, 5],
    [6, 7],
  ];

  ws.getRow(r).height = 14;
  kpis.forEach((k, i) => {
    const [cs, ce] = kpiCols[i]!;
    mergeStyle(ws, r, cs, ce, k[0], {
      bg: ONSF,
      fg: WHT,
      size: 7,
      bold: true,
      hAlign: "center",
    });
  });
  r++;

  ws.getRow(r).height = 28;
  kpis.forEach((k, i) => {
    const [cs, ce] = kpiCols[i]!;
    mergeStyle(ws, r, cs, ce, k[1], {
      bg: WHT,
      fg: k[3],
      size: 16,
      bold: true,
      hAlign: "center",
    });
  });
  r++;

  ws.getRow(r).height = 13;
  kpis.forEach((k, i) => {
    const [cs, ce] = kpiCols[i]!;
    mergeStyle(ws, r, cs, ce, k[2], {
      bg: SLOW,
      fg: PCNT,
      size: 7,
      hAlign: "center",
    });
  });
  r++;

  paintRow(ws, r, 1, 8, SURF);
  ws.getRow(r).height = 10;
  r++;

  const metrics: [string, string, string][] = [
    [
      "LUCRO / HORA",
      rep.netPerHour != null ? `${brlN(rep.netPerHour)}/h` : "—",
      GRN,
    ],
    ["KM RODADOS", formatKmPt(rep.totalKm), ONSF],
    [
      "DIAS TRABALHADOS",
      `${rep.workDays} ${rep.workDays === 1 ? "dia" : "dias"}`,
      ONSF,
    ],
    [
      "CUSTO / KM",
      rep.costPerKm > 0 ? brlN(rep.costPerKm) : "—",
      ONSF,
    ],
    ["HORAS TRABALHADAS", formatHoursPt(rep.workHours), ONSF],
    [
      "TICKET MÉDIO",
      rep.ticketMedioLiquido != null ? brlN(rep.ticketMedioLiquido) : "—",
      ONSF,
    ],
  ];

  for (let i = 0; i < 6; i += 3) {
    const slice = metrics.slice(i, i + 3);
    ws.getRow(r).height = 13;
    slice.forEach((row, j) => {
      const [cs, ce] = kpiCols[j]!;
      mergeStyle(ws, r, cs, ce, row[0], {
        bg: SCNT,
        fg: PCNT,
        size: 6,
        bold: true,
        hAlign: "left",
      });
    });
    r++;
    ws.getRow(r).height = 22;
    slice.forEach((row, j) => {
      const [cs, ce] = kpiCols[j]!;
      mergeStyle(ws, r, cs, ce, row[1], {
        bg: SLOW,
        fg: row[2],
        size: 12,
        bold: true,
        hAlign: "left",
      });
    });
    r++;
    paintRow(ws, r, 1, 8, SURF);
    ws.getRow(r).height = 6;
    r++;
  }

  paintRow(ws, r, 1, 8, SURF);
  ws.getRow(r).height = 6;
  r++;

  mergeStyle(ws, r, 2, 7, "META DO MÊS", {
    bg: BLK,
    fg: WHT,
    size: 9,
    bold: true,
    hAlign: "left",
    height: 16,
  });
  r++;

  const g = rep.goal;
  const metaValor = g ? brlN(g.monthlyTarget) : "—";
  const metaPct = g ? `${g.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";
  const metaFaltam = g
    ? brlN(Math.max(0, g.monthlyTarget - g.earnedTowardGoal))
    : "—";
  const metaItems: [string, string][] = [
    ["META DO PERÍODO", metaValor],
    ["CONCLUÍDO", metaPct],
    ["FALTAM", metaFaltam],
  ];
  ws.getRow(r).height = 13;
  metaItems.forEach((row, j) => {
    const [cs, ce] = kpiCols[j]!;
    mergeStyle(ws, r, cs, ce, row[0], {
      bg: ONSF,
      fg: WHT,
      size: 6,
      bold: true,
      hAlign: "left",
    });
  });
  r++;
  ws.getRow(r).height = 22;
  metaItems.forEach((row, j) => {
    const [cs, ce] = kpiCols[j]!;
    mergeStyle(ws, r, cs, ce, row[1], {
      bg: WHT,
      fg: j === 1 ? GRN : ONSF,
      size: 13,
      bold: true,
      hAlign: "left",
    });
  });
  r++;

  const dimMeta =
    rep.periodMetaDays ?? daysInUtcMonth(rep.year, rep.month);
  const metaDiaria = g ? brlN(g.monthlyTarget / dimMeta) : "—";
  const meta2: [string, string][] = [
    ["META DIÁRIA", metaDiaria],
    ["MELHOR DIA", rep.bestWeekdayLabel ?? "—"],
    ["PIOR DIA", rep.worstWeekdayLabel ?? "—"],
  ];
  ws.getRow(r).height = 13;
  meta2.forEach((row, j) => {
    const [cs, ce] = kpiCols[j]!;
    mergeStyle(ws, r, cs, ce, row[0], {
      bg: SCNT,
      fg: PCNT,
      size: 6,
      bold: true,
      hAlign: "left",
    });
  });
  r++;
  ws.getRow(r).height = 22;
  meta2.forEach((row, j) => {
    const [cs, ce] = kpiCols[j]!;
    mergeStyle(ws, r, cs, ce, row[1], {
      bg: SLOW,
      fg: ONSF,
      size: 12,
      bold: true,
      hAlign: "left",
    });
  });
  r++;

  paintRow(ws, r, 1, 8, SURF);
  ws.getRow(r).height = 10;
  r++;

  mergeStyle(ws, r, 2, 7, "RESUMO FINANCEIRO FINAL", {
    bg: BLK,
    fg: WHT,
    size: 9,
    bold: true,
    hAlign: "left",
    height: 16,
  });
  r++;

  const ticketL =
    rep.ticketMedioLiquido != null
      ? `${brlN(rep.ticketMedioLiquido)} por corrida`
      : "—";
  const rb = rep.grossPerHour != null ? `${brlN(rep.grossPerHour)}/h` : "—";
  const rl = rep.netPerHour != null ? `${brlN(rep.netPerHour)}/h` : "—";
  const resumo: [string, string, string][] = [
    ["TICKET MÉD. LÍQUIDO", ticketL, ONSF],
    ["RENDA BRUTA/HORA", rb, ONSF],
    ["RENDA LÍQUIDA/HORA", rl, GRN],
  ];
  ws.getRow(r).height = 13;
  resumo.forEach((row, j) => {
    const [cs, ce] = kpiCols[j]!;
    mergeStyle(ws, r, cs, ce, row[0], {
      bg: BLK,
      fg: WHT,
      size: 6,
      bold: true,
      hAlign: "left",
    });
  });
  r++;
  ws.getRow(r).height = 24;
  resumo.forEach((row, j) => {
    const [cs, ce] = kpiCols[j]!;
    mergeStyle(ws, r, cs, ce, row[1], {
      bg: WHT,
      fg: row[2],
      size: 13,
      bold: true,
      hAlign: "left",
    });
  });
  r++;

  paintRow(ws, r, 1, 8, SURF);
  ws.getRow(r).height = 6;
  r++;
  mergeStyle(ws, r, 2, 7, `Gerado automaticamente · ${rep.monthLabel} · Copilote`, {
    bg: BLK,
    fg: SCNT,
    size: 7,
    hAlign: "center",
    height: 14,
  });
}

function headerRow(
  ws: ExcelJS.Worksheet,
  row: number,
  c1: number,
  c2: number,
  title: string,
): void {
  paintRow(ws, row, c1, c2, BLK);
  ws.getRow(row).height = 20;
  mergeStyle(ws, row, c1, c2, title, {
    bg: BLK,
    fg: WHT,
    size: 10,
    bold: true,
    hAlign: "left",
  });
}

function subHeaderRow(
  ws: ExcelJS.Worksheet,
  row: number,
  cols: number[],
  labels: string[],
): void {
  ws.getRow(row).height = 15;
  cols.forEach((ci, idx) => {
    const cell = ws.getRow(row).getCell(ci);
    cell.value = labels[idx];
    cell.fill = solidFill(PCNT);
    cell.font = { name: "Calibri", size: 8, bold: true, color: { argb: WHT } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  if (cols[0]! > 1) paintRow(ws, row, 1, cols[0]! - 1, PCNT);
  const last = cols[cols.length - 1]!;
  paintRow(ws, row, last + 1, last + 1, PCNT);
}

function buildPlataformas(ws: ExcelJS.Worksheet, rep: RelatorioMonthReport): void {
  setColWidths(ws, [2, 22, 14, 20, 20, 20, 2]);
  let r = 1;
  headerRow(ws, r, 2, 6, "CORRIDAS POR PLATAFORMA");
  r++;
  const cols = [2, 3, 4, 5, 6];
  subHeaderRow(ws, r, cols, [
    "Plataforma",
    "Corridas",
    "Faturamento",
    "Lucro Líquido",
    "Lucro/hora",
  ]);
  r++;

  const rows = rep.platformRows.filter((p) => p.rideCount > 0);
  if (rows.length === 0) {
    mergeStyle(ws, r, 2, 6, "Nenhuma plataforma registrada.", {
      bg: SLOW,
      fg: PCNT,
      size: 8,
      hAlign: "center",
      height: 18,
    });
    return;
  }
  rows.forEach((p, i) => {
    const bg = i % 2 === 0 ? WHT : SLOW;
    ws.getRow(r).height = 18;
    const star = rep.bestPlatform && p.platform === rep.bestPlatform ? " ★" : "";
    const vals = [
      `${p.platform}${star}`,
      String(p.rideCount),
      brlN(p.gross),
      brlN(p.netProfit),
      p.profitPerHour > 0 ? `${brlN(p.profitPerHour)}/h` : "—",
    ];
    cols.forEach((ci, j) => {
      const cell = ws.getRow(r).getCell(ci);
      cell.value = vals[j];
      cell.fill = solidFill(bg);
      cell.font = {
        name: "Calibri",
        size: 9,
        bold: j === 0,
        color: { argb: j === 4 ? GRN : ONSF },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: j === 0 ? "left" : "center",
      };
    });
    paintRow(ws, r, 1, 1, bg);
    paintRow(ws, r, 7, 7, bg);
    r++;
  });
}

function buildTurnos(ws: ExcelJS.Worksheet, rep: RelatorioMonthReport): void {
  setColWidths(ws, [2, 22, 20, 20, 14, 2]);
  let r = 1;
  headerRow(ws, r, 2, 5, "SCORE POR TURNO");
  r++;
  const cols = [2, 3, 4, 5];
  subHeaderRow(ws, r, cols, ["Turno", "Horário", "Lucro/hora", "Ranking"]);
  r++;

  rep.shiftRanking.forEach((s, i) => {
    const bg = i % 2 === 0 ? WHT : SLOW;
    const { name, hours } = splitShift(s.label);
    ws.getRow(r).height = 18;
    const vals = [
      `${name}${s.rank === 1 ? " ★" : ""}`,
      hours,
      s.profitPerHour > 0 ? `${brlN(s.profitPerHour)}/h` : "—",
      `${s.rank}º`,
    ];
    cols.forEach((ci, j) => {
      const cell = ws.getRow(r).getCell(ci);
      cell.value = vals[j];
      cell.fill = solidFill(bg);
      cell.font = {
        name: "Calibri",
        size: 9,
        bold: j === 0,
        color: { argb: j === 2 ? GRN : ONSF },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: j === 0 ? "left" : "center",
      };
    });
    paintRow(ws, r, 1, 1, bg);
    paintRow(ws, r, 6, 6, bg);
    r++;
  });
}

function buildEnergia(ws: ExcelJS.Worksheet, rep: RelatorioMonthReport): void {
  const isEv = rep.fuel.powertrain === "electric";
  const vol = fuelVolumeUnitShort(rep.fuel.powertrain);
  const title = isEv ? "ENERGIA E VEÍCULO" : "COMBUSTÍVEL E VEÍCULO";
  setColWidths(ws, [2, 28, 20, 28, 20, 2]);
  let r = 1;
  headerRow(ws, r, 2, 5, title);
  r++;

  const volStr =
    rep.fuel.totalLiters > 0
      ? `${rep.fuel.totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${vol}`
      : "—";
  const preco =
    rep.fuel.totalLiters > 0
      ? brlN(rep.fuel.totalFuelCost / rep.fuel.totalLiters)
      : "—";
  const ckmE =
    rep.totalKm > 0 && rep.fuel.totalFuelCost > 0
      ? brlN(rep.fuel.totalFuelCost / rep.totalKm)
      : "—";
  const roi = roiStr(rep.netProfit, rep.totalExpenses);
  const maint = rep.expensesByCategory.find((e) => e.label === "Manutenção");
  const gastoManut = maint ? brlN(maint.amount) : brlN(0);

  const pairs: [string, string, string, string][] = [
    [
      isEv ? "TOTAL (KWH)" : "TOTAL (L)",
      volStr,
      "TOTAL GASTO",
      brlN(rep.fuel.totalFuelCost),
    ],
    [
      isEv ? "PREÇO MÉDIO/KWH" : "PREÇO MÉDIO/L",
      preco,
      "QTD. ABASTEC.",
      "—",
    ],
    [
      "CONSUMO REAL",
      rep.fuel.avgConsumptionKmL != null
        ? `${rep.fuel.avgConsumptionKmL} km/${vol}`
        : "—",
      isEv ? "CUSTO/KM ENERGIA" : "CUSTO/KM COMB.",
      ckmE,
    ],
    [
      "CUSTO/KM TOTAL",
      brlN(rep.costPerKm),
      "DEPRECIAÇÃO/KM",
      "—",
    ],
    [
      "PROVISÃO/KM",
      "—",
      "GASTO MANUT.",
      gastoManut,
    ],
    ["ROI OPERACIONAL", roi, "", ""],
  ];

  pairs.forEach((pair, i) => {
    const bg = i % 2 === 0 ? WHT : SLOW;
    ws.getRow(r).height = 14;
    const [t1, v1, t2, v2] = pair;
    const c2 = ws.getRow(r).getCell(2);
    c2.value = t1;
    c2.fill = solidFill(SCNT);
    c2.font = { name: "Calibri", size: 7, bold: true, color: { argb: PCNT } };
    c2.alignment = { vertical: "middle", horizontal: "left" };

    const c3 = ws.getRow(r).getCell(3);
    c3.value = v1;
    c3.fill = solidFill(bg);
    c3.font = { name: "Calibri", size: 9, bold: true, color: { argb: ONSF } };
    c3.alignment = { vertical: "middle", horizontal: "right" };

    const c4 = ws.getRow(r).getCell(4);
    c4.value = t2;
    c4.fill = solidFill(SCNT);
    c4.font = { name: "Calibri", size: 7, bold: true, color: { argb: PCNT } };
    c4.alignment = { vertical: "middle", horizontal: "left" };

    const c5 = ws.getRow(r).getCell(5);
    c5.value = v2;
    c5.fill = solidFill(bg);
    c5.font = { name: "Calibri", size: 9, bold: true, color: { argb: ONSF } };
    c5.alignment = { vertical: "middle", horizontal: "right" };

    paintRow(ws, r, 1, 1, bg);
    paintRow(ws, r, 6, 6, bg);
    r++;
  });
}

function sectionHdr(ws: ExcelJS.Worksheet, row: number, title: string, colEnd: number): number {
  ws.mergeCells(row, 1, row, colEnd);
  const cell = ws.getRow(row).getCell(1);
  cell.value = title;
  cell.fill = solidFill(BLK);
  cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: WHT } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  for (let c = 2; c <= colEnd; c++) {
    ws.getRow(row).getCell(c).fill = solidFill(BLK);
  }
  ws.getRow(row).height = 16;
  return row + 1;
}

function colHdr(ws: ExcelJS.Worksheet, row: number, headers: string[]): number {
  ws.getRow(row).height = 14;
  headers.forEach((h, i) => {
    const cell = ws.getRow(row).getCell(i + 1);
    cell.value = h;
    cell.fill = solidFill(PCNT);
    cell.font = { name: "Calibri", size: 8, bold: true, color: { argb: WHT } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  return row + 1;
}

function dataRow(ws: ExcelJS.Worksheet, row: number, values: string[], alt: boolean): number {
  const bg = alt ? SLOW : WHT;
  ws.getRow(row).height = 14;
  values.forEach((v, i) => {
    const cell = ws.getRow(row).getCell(i + 1);
    cell.value = v;
    cell.fill = solidFill(bg);
    cell.font = { name: "Calibri", size: 9, color: { argb: ONSF } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  return row + 1;
}

function spacer(ws: ExcelJS.Worksheet, row: number): number {
  ws.getRow(row).height = 8;
  return row + 1;
}

function buildPowerBi(ws: ExcelJS.Worksheet, rep: RelatorioMonthReport): void {
  for (let i = 1; i <= 10; i++) ws.getColumn(i).width = 22;
  let r = 1;
  const note = "Dados do período selecionado";
  const margem = margemPct(rep.gross, rep.netProfit);
  const g = rep.goal;

  r = sectionHdr(ws, r, "MÉTRICAS GERAIS", 4);
  r = colHdr(ws, r, ["Campo", "Valor", "Nota", "Período"]);
  const metricasGerais: [string, string, string, string][] = [
    ["Faturamento Bruto", brlN(rep.gross), note, rep.monthLabel],
    ["Total de Gastos", brlN(rep.totalExpenses), note, rep.monthLabel],
    ["Lucro Líquido", brlN(rep.netProfit), note, rep.monthLabel],
    ["Margem Líquida", margem, "sobre o faturamento bruto", rep.monthLabel],
    [
      "Corridas",
      String(rep.totalRides),
      "",
      rep.monthLabel,
    ],
    [
      "Lucro/hora",
      rep.netPerHour != null ? `${brlN(rep.netPerHour)}/h` : "—",
      "",
      rep.monthLabel,
    ],
    [
      "Custo/km",
      rep.costPerKm > 0 ? brlN(rep.costPerKm) : "—",
      "",
      rep.monthLabel,
    ],
    ["Km Rodados", formatKmPt(rep.totalKm), "", rep.monthLabel],
    ["Horas Trabalhadas", formatHoursPt(rep.workHours), "", rep.monthLabel],
    [
      "Dias Trabalhados",
      `${rep.workDays}`,
      "",
      rep.monthLabel,
    ],
    [
      "Ticket Médio",
      rep.ticketMedioLiquido != null ? brlN(rep.ticketMedioLiquido) : "—",
      "",
      rep.monthLabel,
    ],
  ];
  metricasGerais.forEach((row, i) => {
    r = dataRow(ws, r, [...row], i % 2 === 1);
  });
  r = spacer(ws, r);

  r = sectionHdr(ws, r, "PLATAFORMAS", 5);
  r = colHdr(ws, r, [
    "Plataforma",
    "Corridas",
    "Faturamento",
    "Lucro Líquido",
    "Lucro/hora",
  ]);
  const plats = rep.platformRows.filter((p) => p.rideCount > 0);
  plats.forEach((p, i) => {
    r = dataRow(
      ws,
      r,
      [
        `${p.platform}${rep.bestPlatform === p.platform ? " ★" : ""}`,
        String(p.rideCount),
        brlN(p.gross),
        brlN(p.netProfit),
        p.profitPerHour > 0 ? `${brlN(p.profitPerHour)}/h` : "—",
      ],
      i % 2 === 1,
    );
  });
  r = spacer(ws, r);

  r = sectionHdr(ws, r, "TURNOS", 4);
  r = colHdr(ws, r, ["Turno", "Horário", "Lucro/hora", "Ranking"]);
  rep.shiftRanking.forEach((s, i) => {
    const { name, hours } = splitShift(s.label);
    r = dataRow(
      ws,
      r,
      [
        name,
        hours,
        s.profitPerHour > 0 ? `${brlN(s.profitPerHour)}/h` : "—",
        `${s.rank}º`,
      ],
      i % 2 === 1,
    );
  });
  r = spacer(ws, r);

  r = sectionHdr(ws, r, "META DO MÊS", 4);
  r = colHdr(ws, r, ["Campo", "Valor", "", ""]);
  const metaRows: [string, string, string, string][] = g
    ? [
        ["Meta do Período", brlN(g.monthlyTarget), "", ""],
        [
          "% Concluído",
          `${g.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
          "",
          "",
        ],
        [
          "Faltam",
          brlN(Math.max(0, g.monthlyTarget - g.earnedTowardGoal)),
          "",
          "",
        ],
        [
          "Meta Diária",
          brlN(
            g.monthlyTarget /
              (rep.periodMetaDays ?? daysInUtcMonth(rep.year, rep.month)),
          ),
          "",
          "",
        ],
        ["Melhor Dia", rep.bestWeekdayLabel ?? "—", "", ""],
        ["Pior Dia", rep.worstWeekdayLabel ?? "—", "", ""],
      ]
    : [["Meta", "Não definida", "", ""]];
  metaRows.forEach((row, i) => {
    r = dataRow(ws, r, [...row], i % 2 === 1);
  });
  r = spacer(ws, r);

  const isEv = rep.fuel.powertrain === "electric";
  const vol = fuelVolumeUnitShort(rep.fuel.powertrain);
  r = sectionHdr(ws, r, isEv ? "ENERGIA E VEÍCULO" : "COMBUSTÍVEL E VEÍCULO", 2);
  r = colHdr(ws, r, ["Campo", "Valor"]);
  const volStr =
    rep.fuel.totalLiters > 0
      ? `${rep.fuel.totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${vol}`
      : "—";
  const precoEnergia =
    rep.fuel.totalLiters > 0
      ? brlN(rep.fuel.totalFuelCost / rep.fuel.totalLiters)
      : "—";
  const ckmEnergia =
    rep.totalKm > 0 && rep.fuel.totalFuelCost > 0
      ? brlN(rep.fuel.totalFuelCost / rep.totalKm)
      : "—";
  const maintPb = rep.expensesByCategory.find((e) => e.label === "Manutenção");
  const gastoManutPb = maintPb ? brlN(maintPb.amount) : brlN(0);
  const consumoReal =
    rep.fuel.avgConsumptionKmL != null
      ? `${rep.fuel.avgConsumptionKmL} km/${vol}`
      : "—";

  const energiaRows: [string, string][] = [
    [isEv ? "Total (kWh)" : "Total (L)", volStr],
    ["Total Gasto", brlN(rep.fuel.totalFuelCost)],
    [isEv ? "Preço médio/kWh" : "Preço médio/L", precoEnergia],
    ["Qtd. Abastec.", "—"],
    ["Consumo Real", consumoReal],
    [isEv ? "Custo/km Energia" : "Custo/km Comb.", ckmEnergia],
    ["Custo/km Total", brlN(rep.costPerKm)],
    ["Depreciação/km", "—"],
    ["Provisão/km", "—"],
    ["Gasto Manutenção", gastoManutPb],
    ["ROI Operacional", roiStr(rep.netProfit, rep.totalExpenses)],
  ];
  energiaRows.forEach((row, i) => {
    r = dataRow(ws, r, [...row], i % 2 === 1);
  });
  r = spacer(ws, r);

  r = sectionHdr(ws, r, "RESUMO FINANCEIRO", 2);
  r = colHdr(ws, r, ["Campo", "Valor"]);
  const resumoRows: [string, string][] = [
    [
      "Ticket Médio Líquido",
      rep.ticketMedioLiquido != null ? brlN(rep.ticketMedioLiquido) : "—",
    ],
    [
      "Renda Bruta/hora",
      rep.grossPerHour != null ? `${brlN(rep.grossPerHour)}/h` : "—",
    ],
    [
      "Renda Líquida/hora",
      rep.netPerHour != null ? `${brlN(rep.netPerHour)}/h` : "—",
    ],
  ];
  resumoRows.forEach((row, i) => {
    r = dataRow(ws, r, [...row], i % 2 === 1);
  });
}

export async function buildMonthlyReportWorkbookBuffer(
  rep: RelatorioMonthReport,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Copilote";
  wb.created = new Date();

  const dash = wb.addWorksheet("Dashboard", {
    views: [{ showGridLines: false }],
  });
  buildDashboard(dash, rep);

  const plat = wb.addWorksheet("Plataformas", {
    views: [{ showGridLines: false }],
  });
  buildPlataformas(plat, rep);

  const turn = wb.addWorksheet("Turnos", { views: [{ showGridLines: false }] });
  buildTurnos(turn, rep);

  const isEv = rep.fuel.powertrain === "electric";
  const energia = wb.addWorksheet(isEv ? "Energia" : "Combustivel", {
    views: [{ showGridLines: false }],
  });
  buildEnergia(energia, rep);

  const raw = wb.addWorksheet("Dados_PowerBI", {
    views: [{ showGridLines: false }],
  });
  buildPowerBi(raw, rep);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
