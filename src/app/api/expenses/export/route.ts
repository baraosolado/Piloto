import { and, asc, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { expenses, vehicles } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import {
  fuelCategoryUiLabel,
  fuelExpenseUi,
  normalizePowertrain,
  type VehiclePowertrain,
} from "@/lib/vehicle-powertrain";
import { safeParseMonthYearFromUrl } from "@/lib/api-query-validators";
import { copiloteCsvLeadIn } from "@/lib/csv-copilote-header";
import { csvLine } from "@/lib/csv-export";
import { getEffectivePlan } from "@/lib/plan-limits";

export const runtime = "nodejs";

function categoryPt(c: string, fuelPt: VehiclePowertrain): string {
  switch (c) {
    case "fuel":
      return fuelCategoryUiLabel(fuelPt);
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
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, auth.userId),
        gte(expenses.occurredAt, start),
        lte(expenses.occurredAt, end),
      ),
    )
    .orderBy(asc(expenses.occurredAt));

  const [vRow] = await getRequestDb()
    .select({ powertrain: vehicles.powertrain })
    .from(vehicles)
    .where(eq(vehicles.userId, auth.userId))
    .limit(1);
  const fuelPt = normalizePowertrain(vRow?.powertrain);
  const volHeader = fuelExpenseUi(fuelPt).csvVolumeColumn;

  const header = [
    "id",
    "categoria",
    "valor_brl",
    "odometro",
    volHeader,
    "descricao",
    "data_iso",
    "criado_em_iso",
  ];

  let body = "\uFEFF";
  body += copiloteCsvLeadIn({
    exportTitle: "Exportação — Gastos (lançamentos do período)",
    month,
    year,
  });
  body += csvLine(header);
  for (const e of rows) {
    body += csvLine([
      e.id,
      categoryPt(e.category, fuelPt),
      String(e.amount),
      e.odometer != null ? String(e.odometer) : "",
      e.liters != null ? String(e.liters) : "",
      e.description?.replace(/\r?\n/g, " ") ?? "",
      e.occurredAt.toISOString(),
      e.createdAt.toISOString(),
    ]);
  }

  const filename = `copilote-gastos-${year}-${String(month).padStart(2, "0")}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
  });
}
