import { and, asc, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rides } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
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
          message: "Exportação CSV disponível no plano Premium.",
        },
      },
      { status: 403 },
    );
  }

  const { month, year } = parsed;
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const rows = await db
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

  const filename = `piloto-corridas-${year}-${String(month).padStart(2, "0")}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
