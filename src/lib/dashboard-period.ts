export type DashboardPeriod = "today" | "week" | "month" | "custom";

export type DateRange = { start: Date; end: Date };

function utcDayStart(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

function utcDayEnd(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function startOfUtcWeekMonday(d: Date): Date {
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const x = utcDayStart(d);
  x.setUTCDate(x.getUTCDate() - mondayOffset);
  return x;
}

function endOfUtcWeekSunday(d: Date): Date {
  const start = startOfUtcWeekMonday(d);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return utcDayEnd(end);
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfUtcMonth(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function durationMs(a: Date, b: Date): number {
  return Math.max(0, b.getTime() - a.getTime());
}

/**
 * Intervalo atual e o intervalo anterior equivalente para comparação.
 */
export function resolveDashboardRanges(
  period: DashboardPeriod,
  now: Date,
  customFrom?: string | null,
  customTo?: string | null,
): { current: DateRange; previous: DateRange } {
  if (period === "today") {
    const current = {
      start: utcDayStart(now),
      end: utcDayEnd(now),
    };
    const y = addUtcDays(now, -1);
    const previous = { start: utcDayStart(y), end: utcDayEnd(y) };
    return { current, previous };
  }

  if (period === "week") {
    const current = {
      start: startOfUtcWeekMonday(now),
      end: endOfUtcWeekSunday(now),
    };
    const prevEnd = addUtcDays(current.start, -1);
    const previous = {
      start: startOfUtcWeekMonday(prevEnd),
      end: endOfUtcWeekSunday(prevEnd),
    };
    return { current, previous };
  }

  if (period === "month") {
    const current = {
      start: startOfUtcMonth(now),
      end: endOfUtcMonth(now),
    };
    const prevRef = addUtcDays(current.start, -1);
    const previous = {
      start: startOfUtcMonth(prevRef),
      end: endOfUtcMonth(prevRef),
    };
    return { current, previous };
  }

  const fromParsed = customFrom ? new Date(`${customFrom}T00:00:00.000Z`) : null;
  const toParsed = customTo ? new Date(`${customTo}T23:59:59.999Z`) : null;
  if (
    !fromParsed ||
    !toParsed ||
    Number.isNaN(fromParsed.getTime()) ||
    Number.isNaN(toParsed.getTime()) ||
    fromParsed > toParsed
  ) {
    return resolveDashboardRanges("month", now, null, null);
  }

  const current = { start: fromParsed, end: toParsed };
  const len = durationMs(current.start, current.end);
  const previousEnd = new Date(current.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - len);
  const previous = { start: previousStart, end: previousEnd };
  return { current, previous };
}

export function parseDashboardPeriod(
  raw: string | undefined,
): DashboardPeriod {
  if (
    raw === "today" ||
    raw === "week" ||
    raw === "month" ||
    raw === "custom"
  ) {
    return raw;
  }
  return "month";
}

/** Lista cada dia UTC entre start e end (inclusive), meia-noite UTC. */
export function eachUtcDayInRange(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = utcDayStart(start);
  const last = utcDayStart(end);
  while (cur <= last) {
    out.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
