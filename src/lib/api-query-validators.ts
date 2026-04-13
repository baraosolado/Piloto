import { z } from "zod";
import { MAX_REPORT_RANGE_DAYS } from "@/lib/report-range-constants";
import { inclusiveUtcCalendarDayCount } from "@/lib/relatorio-month-preview";

/** Query `?month=1-12&year=2000-2100` (relatórios e exports CSV/PDF). */
export const monthYearQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export type MonthYearQuery = z.infer<typeof monthYearQuerySchema>;

export function safeParseMonthYearFromUrl(url: URL) {
  return monthYearQuerySchema.safeParse({
    month: url.searchParams.get("month"),
    year: url.searchParams.get("year"),
  });
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Início (00:00) ou fim (23:59:59.999) do dia em UTC a partir de `YYYY-MM-DD`. */
export function parseYmdUtcBoundary(
  ymd: string,
  endOfDay: boolean,
): Date | null {
  const m = ISO_DATE.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return null;
  }
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== mo - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }
  if (endOfDay) {
    return new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
  }
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
}

export type ReportRangeQuery = {
  start: Date;
  end: Date;
  from: string;
  to: string;
};

export function safeParseReportRangeFromUrl(url: URL) {
  const from = url.searchParams.get("from")?.trim();
  const to = url.searchParams.get("to")?.trim();
  if (!from || !to) {
    return {
      success: false as const,
      error: {
        issues: [
          { message: "Informe from e to no formato YYYY-MM-DD (UTC)." },
        ],
      },
    };
  }
  const start = parseYmdUtcBoundary(from, false);
  const end = parseYmdUtcBoundary(to, true);
  if (!start || !end) {
    return {
      success: false as const,
      error: {
        issues: [{ message: "Datas inválidas. Use YYYY-MM-DD (UTC)." }],
      },
    };
  }
  if (start.getTime() > end.getTime()) {
    return {
      success: false as const,
      error: {
        issues: [{ message: "A data inicial não pode ser depois da final." }],
      },
    };
  }
  const span = inclusiveUtcCalendarDayCount(start, end);
  if (span > MAX_REPORT_RANGE_DAYS) {
    return {
      success: false as const,
      error: {
        issues: [
          {
            message: `Período máximo: ${MAX_REPORT_RANGE_DAYS} dias (UTC).`,
          },
        ],
      },
    };
  }
  return {
    success: true as const,
    data: { start, end, from, to } satisfies ReportRangeQuery,
  };
}

/** Para `searchParams` do App Router (string | string[] | undefined). */
export function safeParseReportRangeFromParams(
  from: string | string[] | undefined,
  to: string | string[] | undefined,
) {
  const f = (Array.isArray(from) ? from[0] : from)?.trim();
  const t = (Array.isArray(to) ? to[0] : to)?.trim();
  const url = new URL("http://localhost");
  if (f) url.searchParams.set("from", f);
  if (t) url.searchParams.set("to", t);
  return safeParseReportRangeFromUrl(url);
}

/** Parâmetro dinâmico `[id]` nas tabelas com PK uuid. */
export const routeUuidParamSchema = z.string().uuid();
