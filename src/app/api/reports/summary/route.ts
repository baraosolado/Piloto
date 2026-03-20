import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api-session";
import { getEffectivePlan } from "@/lib/plan-limits";
import { getReportsSummary } from "@/lib/reports-summary";

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

  const plan = await getEffectivePlan(auth.userId, auth.email);
  if (plan !== "premium") {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message:
            "Esta funcionalidade está disponível apenas no plano Premium.",
        },
      },
      { status: 403 },
    );
  }

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

  try {
    const summary = await getReportsSummary(
      auth.userId,
      parsed.year,
      parsed.month,
    );
    const payload = {
      ...summary,
      historicoDownloads: summary.historicoDownloads.map((h) => ({
        ...h,
        generatedAt: h.generatedAt.toISOString(),
      })),
    };
    return NextResponse.json({ data: payload, error: null });
  } catch (e) {
    console.error("[reports/summary]", e);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL",
          message: "Não foi possível carregar o resumo do relatório.",
        },
      },
      { status: 500 },
    );
  }
}
