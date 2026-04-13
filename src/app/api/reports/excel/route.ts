import { NextResponse } from "next/server";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { reportDownloads } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import {
  safeParseMonthYearFromUrl,
  safeParseReportRangeFromUrl,
} from "@/lib/api-query-validators";
import { buildMonthlyReportWorkbookBuffer } from "@/lib/excel/build-monthly-report-workbook";
import {
  getRelatorioDateRangePreview,
  getRelatorioMonthPreview,
} from "@/lib/relatorio-month-preview";
import { getEffectivePlan } from "@/lib/plan-limits";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const rangeParsed = safeParseReportRangeFromUrl(url);

  if (rangeParsed.success) {
    return runWithAppUserId(auth.userId, async () => {
      const plan = await getEffectivePlan(auth.userId, auth.email);
      if (plan !== "premium") {
        return NextResponse.json(
          {
            data: null,
            error: {
              code: "FORBIDDEN",
              message: "Relatório Excel disponível no plano Premium.",
            },
          },
          { status: 403 },
        );
      }

      const { start, end, from, to } = rangeParsed.data;
      const report = await getRelatorioDateRangePreview(
        auth.userId,
        start,
        end,
      );
      const buffer = await buildMonthlyReportWorkbookBuffer(report);

      const month = end.getUTCMonth() + 1;
      const year = end.getUTCFullYear();
      try {
        await getRequestDb().insert(reportDownloads).values({
          userId: auth.userId,
          month,
          year,
        });
      } catch (e) {
        console.error("[reports/excel] report_downloads insert", e);
      }

      const filename = `copilote-relatorio-${from}_a_${to}.xlsx`;

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    });
  }

  const parsed = safeParseMonthYearFromUrl(url);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION",
          message:
            first?.message ??
            "Informe month (1–12) e year, ou from e to (YYYY-MM-DD, UTC).",
        },
      },
      { status: 400 },
    );
  }

  return runWithAppUserId(auth.userId, async () => {
    const plan = await getEffectivePlan(auth.userId, auth.email);
    if (plan !== "premium") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "Relatório Excel disponível no plano Premium.",
          },
        },
        { status: 403 },
      );
    }

    const { month, year } = parsed.data;
    const report = await getRelatorioMonthPreview(auth.userId, year, month);
    const buffer = await buildMonthlyReportWorkbookBuffer(report);

    try {
      await getRequestDb().insert(reportDownloads).values({
        userId: auth.userId,
        month,
        year,
      });
    } catch (e) {
      console.error("[reports/excel] report_downloads insert", e);
    }

    const filename = `copilote-relatorio-${year}-${String(month).padStart(2, "0")}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
