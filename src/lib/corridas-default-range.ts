import { endOfMonth, format, startOfMonth } from "date-fns";

/** Intervalo padrão da lista de corridas: mês civil atual (datas locais). */
export function defaultRideListDateRange() {
  const now = new Date();
  return {
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

export function isDefaultRideListRange(from: string, to: string): boolean {
  const d = defaultRideListDateRange();
  return from === d.from && to === d.to;
}
