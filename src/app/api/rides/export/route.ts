import { and, asc, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { rides } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import { safeParseMonthYearFromUrl } from "@/lib/api-query-validators";
import { copiloteCsvLeadIn } from "@/lib/csv-copilote-header";
import { csvLine } from "@/lib/csv-export";
import { getEffectivePlan } from "@/lib/plan-limits";

export const runtime = "nodejs";

function platformPt(p: string): string {
  switch (p) {
    case "uber":
      return "Uber";
    case "99":
      return "99";
    case "indrive":
      return "inDrive";
    case "particular":
      return "Particular";
    default:
      return p;
  }
}

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
          message: "Exportação CSV disponível no plano Premium.",
        },
      },
      { status: 403 },
    );
  }

  const { month, year } = parsed.data;
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const rows = await getRequestDb()
    .select()
    .from(rides)
    .where(
      and(
        eq(rides.userId, auth.userId),
        gte(rides.startedAt, start),
        lte(rides.startedAt, end),
      ),
    )
    .orderBy(asc(rides.startedAt));

  const header = [
    "id",
    "plataforma",
    "valor_bruto_brl",
    "distancia_km",
    "inicio_iso",
    "duracao_minutos",
    "observacao",
    "criado_em_iso",
  ];

  let body = "\uFEFF";
  body += copiloteCsvLeadIn({
    exportTitle: "Exportação — Corridas (resumo por dia registrado)",
    month,
    year,
  });
  body += csvLine(header);
  for (const r of rows) {
    body += csvLine([
      r.id,
      platformPt(r.platform),
      String(r.grossAmount),
      String(r.distanceKm),
      r.startedAt.toISOString(),
      r.durationMinutes != null ? String(r.durationMinutes) : "",
      r.notes?.replace(/\r?\n/g, " ") ?? "",
      r.createdAt.toISOString(),
    ]);
  }

  const filename = `copilote-corridas-${year}-${String(month).padStart(2, "0")}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
  });
}
