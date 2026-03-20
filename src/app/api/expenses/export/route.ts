import { and, asc, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { csvLine } from "@/lib/csv-export";
import { getEffectivePlan } from "@/lib/plan-limits";

export const runtime = "nodejs";

function categoryPt(c: string): string {
  switch (c) {
    case "fuel":
      return "Combustível";
    case "maintenance":
      return "Manutenção";
    case "insurance":
      return "Seguro";
    case "fine":
      return "Multa";
    case "other":
      return "Outros";
    default:
      return c;
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
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, auth.userId),
        gte(expenses.occurredAt, start),
        lte(expenses.occurredAt, end),
      ),
    )
    .orderBy(asc(expenses.occurredAt));

  const header = [
    "id",
    "categoria",
    "valor_brl",
    "odometro",
    "litros",
    "descricao",
    "data_iso",
    "criado_em_iso",
  ];

  let body = "\uFEFF";
  body += csvLine(header);
  for (const e of rows) {
    body += csvLine([
      e.id,
      categoryPt(e.category),
      String(e.amount),
      e.odometer != null ? String(e.odometer) : "",
      e.liters != null ? String(e.liters) : "",
      e.description?.replace(/\r?\n/g, " ") ?? "",
      e.occurredAt.toISOString(),
      e.createdAt.toISOString(),
    ]);
  }

  const filename = `piloto-gastos-${year}-${String(month).padStart(2, "0")}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
