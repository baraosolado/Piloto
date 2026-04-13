import { NextResponse } from "next/server";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { requireSession } from "@/lib/api-session";
import { safeParseMonthYearFromUrl } from "@/lib/api-query-validators";
import { getEffectivePlan } from "@/lib/plan-limits";
import { getReportsSummary } from "@/lib/reports-summary";

export async function GET(req: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = safeParseMonthYearFromUrl(new URL(req.url));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION",
          message: first?.message ?? "Informe month (1–12) e year válidos na query.",
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
          message:
            "Esta funcionalidade está disponível apenas no plano Premium.",
        },
      },
      { status: 403 },
    );
  }

  try {
    const summary = await getReportsSummary(
      auth.userId,
      parsed.data.year,
      parsed.data.month,
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
  });
}
