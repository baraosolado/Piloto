import { NextResponse } from "next/server";
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gte,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { expenses, rides, vehicles } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import {
  fuelCategoryUiLabel,
  fuelExpenseUi,
  normalizePowertrain,
  type VehiclePowertrain,
} from "@/lib/vehicle-powertrain";
import {
  countExpensesThisMonth,
  getEffectivePlan,
  isFreeExpenseLimitReached,
} from "@/lib/plan-limits";

const categorySchema = z.enum([
  "fuel",
  "maintenance",
  "insurance",
  "fine",
  "other",
]);

type ExpenseCategory = z.infer<typeof categorySchema>;

function categoryLabel(c: ExpenseCategory, fuelPt: VehiclePowertrain): string {
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

const listQuerySchema = z.object({
  startDate: z
    .string()
    .optional()
    .refine((s) => !s || !Number.isNaN(Date.parse(s)), "startDate inválida")
    .transform((s) => (s ? new Date(s) : undefined)),
  endDate: z
    .string()
    .optional()
    .refine((s) => !s || !Number.isNaN(Date.parse(s)), "endDate inválida")
    .transform((s) => (s ? new Date(s) : undefined)),
  category: categorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(["recent", "oldest", "amount_desc", "amount_asc"])
    .default("recent"),
});

function buildPostBodySchema(pt: VehiclePowertrain) {
  const ui = fuelExpenseUi(pt);
  return z
    .object({
      category: categorySchema,
      amount: z.number().positive(),
      odometer: z.number().int().min(0).optional().nullable(),
      liters: z.number().positive().optional().nullable(),
      description: z.string().max(2000).nullable().optional(),
      occurredAt: z.preprocess(
        (v) => {
          if (typeof v === "string" || typeof v === "number")
            return new Date(v);
          return v;
        },
        z.date({ invalid_type_error: "occurredAt inválido" }),
      ),
    })
    .superRefine((data, ctx) => {
      if (data.category === "fuel") {
        if (data.odometer === undefined || data.odometer === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: ui.apiOdometerRequired,
            path: ["odometer"],
          });
        }
        if (data.liters === undefined || data.liters === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: ui.apiVolumeRequired,
            path: ["liters"],
          });
        }
      }
    });
}

function serializeExpense(row: typeof expenses.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    amount: Number(row.amount),
    odometer: row.odometer,
    liters: row.liters !== null ? Number(row.liters) : null,
    description: row.description,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function expenseDateConditions(
  userId: string,
  startDate: Date | undefined,
  endDate: Date | undefined,
): SQL[] {
  const c: SQL[] = [eq(expenses.userId, userId)];
  if (startDate && endDate) {
    c.push(between(expenses.occurredAt, startDate, endDate));
  } else if (startDate) {
    c.push(gte(expenses.occurredAt, startDate));
  } else if (endDate) {
    c.push(lte(expenses.occurredAt, endDate));
  }
  return c;
}

function rideDateConditions(
  userId: string,
  startDate: Date | undefined,
  endDate: Date | undefined,
): SQL[] {
  const c: SQL[] = [eq(rides.userId, userId)];
  if (startDate && endDate) {
    c.push(between(rides.startedAt, startDate, endDate));
  } else if (startDate) {
    c.push(gte(rides.startedAt, startDate));
  } else if (endDate) {
    c.push(lte(rides.startedAt, endDate));
  }
  return c;
}

export async function GET(request: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const { searchParams } = new URL(request.url);
  const raw = Object.fromEntries(searchParams.entries());
  const parsed = listQuerySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: first?.message ?? "Parâmetros inválidos.",
        },
      },
      { status: 400 },
    );
  }

  const { startDate, endDate, category, page, limit, sort } = parsed.data;
  const conditions: SQL[] = expenseDateConditions(userId, startDate, endDate);
  if (category) {
    conditions.push(eq(expenses.category, category));
  }

  const whereClause = and(...conditions);

  return runWithAppUserId(userId, async () => {
  const [vRow] = await getRequestDb()
    .select({ powertrain: vehicles.powertrain })
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .limit(1);
  const fuelPt = normalizePowertrain(vRow?.powertrain);

  const [countRow] = await getRequestDb()
    .select({ n: count() })
    .from(expenses)
    .where(whereClause);
  const total = Number(countRow?.n ?? 0);
  const totalPages =
    total === 0 ? 0 : Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;

  const orderBy =
    sort === "oldest"
      ? asc(expenses.occurredAt)
      : sort === "amount_desc"
        ? desc(expenses.amount)
        : sort === "amount_asc"
          ? asc(expenses.amount)
          : desc(expenses.occurredAt);

  const rows = await getRequestDb()
    .select()
    .from(expenses)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const [sumRow] = await getRequestDb()
    .select({
      t: sql<string>`coalesce(sum(${expenses.amount}::numeric), 0)::text`,
    })
    .from(expenses)
    .where(whereClause);

  const totalAmount = Number.parseFloat(sumRow?.t ?? "0");

  const byCategory = await getRequestDb()
    .select({
      category: expenses.category,
      sub: sql<string>`coalesce(sum(${expenses.amount}::numeric), 0)::text`,
    })
    .from(expenses)
    .where(whereClause)
    .groupBy(expenses.category);

  let topCategory: {
    category: ExpenseCategory;
    label: string;
    amount: number;
    percentOfTotal: number;
  } | null = null;
  if (totalAmount > 0 && byCategory.length > 0) {
    const sorted = [...byCategory].sort(
      (a, b) => Number.parseFloat(b.sub) - Number.parseFloat(a.sub),
    );
    const first = sorted[0];
    const amt = Number.parseFloat(first.sub);
    topCategory = {
      category: first.category,
      label: categoryLabel(first.category, fuelPt),
      amount: amt,
      percentOfTotal: (amt / totalAmount) * 100,
    };
  }

  const fuelDateWhere = and(
    ...expenseDateConditions(userId, startDate, endDate),
    eq(expenses.category, "fuel"),
  );
  const [fuelSumRow] = await getRequestDb()
    .select({
      t: sql<string>`coalesce(sum(${expenses.amount}::numeric), 0)::text`,
    })
    .from(expenses)
    .where(fuelDateWhere);
  const fuelTotal = Number.parseFloat(fuelSumRow?.t ?? "0");

  const rideWhere = and(...rideDateConditions(userId, startDate, endDate));
  const [kmRow] = await getRequestDb()
    .select({
      t: sql<string>`coalesce(sum(${rides.distanceKm}::numeric), 0)::text`,
    })
    .from(rides)
    .where(rideWhere);
  const kmTotal = Number.parseFloat(kmRow?.t ?? "0");
  const costPerKm =
    kmTotal > 0 && fuelTotal > 0 ? fuelTotal / kmTotal : null;

  return NextResponse.json({
    data: {
      expenses: rows.map(serializeExpense),
      total,
      page,
      totalPages,
      summary: {
        totalAmount,
        topCategory,
        costPerKm,
      },
    },
    error: null,
  });
  });
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { userId, email } = auth;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "BAD_REQUEST", message: "Corpo inválido." },
      },
      { status: 400 },
    );
  }

  return runWithAppUserId(userId, async () => {
  const [vRow] = await getRequestDb()
    .select({ powertrain: vehicles.powertrain })
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .limit(1);
  const fuelPt = normalizePowertrain(vRow?.powertrain);

  const body = buildPostBodySchema(fuelPt).safeParse(json);
  if (!body.success) {
    const first = body.error.issues[0];
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: first?.message ?? "Dados inválidos.",
        },
      },
      { status: 400 },
    );
  }

  const plan = await getEffectivePlan(userId, email);
  if (plan === "free") {
    const n = await countExpensesThisMonth(userId);
    if (isFreeExpenseLimitReached(n)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "LIMIT_REACHED",
            message:
              "Limite de 20 gastos no plano gratuito foi atingido neste mês.",
          },
        },
        { status: 403 },
      );
    }
  }

  const d = body.data;
  const [inserted] = await getRequestDb()
    .insert(expenses)
    .values({
      userId,
      category: d.category,
      amount: d.amount.toFixed(2),
      odometer: d.odometer ?? null,
      liters:
        d.liters !== undefined && d.liters !== null
          ? d.liters.toFixed(2)
          : null,
      description: d.description ?? null,
      occurredAt: d.occurredAt,
    })
    .returning();

  return NextResponse.json({
    data: { expense: serializeExpense(inserted) },
    error: null,
  });
  });
}
