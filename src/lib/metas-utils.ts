/** Conta dias úteis (seg–sex, UTC) no mês. */
export function countWeekdaysInUtcMonth(
  year: number,
  month1to12: number,
): number {
  const lastDay = new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
  let c = 0;
  for (let d = 1; d <= lastDay; d++) {
    const wd = new Date(Date.UTC(year, month1to12 - 1, d)).getUTCDay();
    if (wd !== 0 && wd !== 6) c++;
  }
  return c;
}

/** Dias úteis restantes de `from` (início do dia UTC) até o fim do mês, inclusive. */
export function countRemainingWeekdaysInUtcMonth(
  from: Date,
  year: number,
  month1to12: number,
): number {
  const end = new Date(Date.UTC(year, month1to12, 0, 23, 59, 59, 999));
  const cur = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  let c = 0;
  while (cur.getTime() <= end.getTime()) {
    const wd = cur.getUTCDay();
    if (wd !== 0 && wd !== 6) c++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return c;
}

export type HistoryBadge = "atingida" | "parcial" | "nao_atingida" | "sem_meta";

export function historyBadge(
  target: number | null,
  earned: number,
): HistoryBadge {
  if (target === null || target <= 0) return "sem_meta";
  const pct = (earned / target) * 100;
  if (pct >= 100) return "atingida";
  if (earned > 0) return "parcial";
  return "nao_atingida";
}
