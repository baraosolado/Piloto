import { csvLine } from "@/lib/csv-export";

const APP_TAGLINE =
  "Copilote — performance financeira para motoristas de aplicativo";

/**
 * Linhas iniciais com identidade Copilote (CSV é texto; “logo” = marca + contexto).
 */
export function copiloteCsvLeadIn(params: {
  exportTitle: string;
  month: number;
  year: number;
}): string {
  const { exportTitle, month, year } = params;
  const periodLabel = new Date(
    Date.UTC(year, month - 1, 1),
  ).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const periodCap = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
  const generated = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";

  let s = "";
  s += csvLine([APP_TAGLINE]);
  s += csvLine([exportTitle]);
  s += csvLine([`Período: ${periodCap}`]);
  s += csvLine([`Arquivo gerado em: ${generated}`]);
  if (baseUrl) s += csvLine([`Origem: ${baseUrl}`]);
  s += csvLine([
    "Os valores abaixo refletem o cadastro na Copilote (BRL). Use como anexo ou controle interno.",
  ]);
  s += csvLine([]);
  return s;
}
