import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { createElement, type ReactElement } from "react";
import { db } from "@/db";
import { reportDownloads } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { MonthlyReportDocument } from "@/lib/pdf/monthly-report-document";
import { getRelatorioMonthPreview } from "@/lib/relatorio-month-preview";
import { getEffectivePlan } from "@/lib/plan-limits";

export const runtime = "nodejs";

function parseMonthYear(url: URL): { month: number; year: number } | null {
  const month = Number(url.searchParams.get("month"));
  const year = Number(url.searchParams.get("year"));
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  return { month, year };
}

export async function GET(req: Request) {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;

  const parsed = parseMonthYear(new URL(req.url));
  if (!parsed) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION",
          message: "Informe month (1–12) e year válidos na query.",
        },
      },
      { status: 400 },
    );
  }

  const plan = await getEffectivePlan(auth.userId, auth.email);
  if (plan !== "premium") {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Relatório PDF disponível no plano Premium.",
        },
      },
      { status: 403 },
    );
  }

  const { month, year } = parsed;
  const report = await getRelatorioMonthPreview(auth.userId, year, month);

  const doc = createElement(MonthlyReportDocument, { report });

  const buffer = await renderToBuffer(
    doc as ReactElement<Record<string, unknown>>,
  );

  try {
    await db.insert(reportDownloads).values({
      userId: auth.userId,
      month,
      year,
    });
  } catch (e) {
    console.error("[reports/pdf] report_downloads insert", e);
  }

  const filename = `piloto-relatorio-${year}-${String(month).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
