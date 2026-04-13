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
import { rides, vehicles } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import {
  calculateRideCost,
  calculateRideProfit,
  type Vehicle,
} from "@/lib/calculations";
import {
  consumptionBounds,
  normalizePowertrain,
  vehicleFromVehicleRow,
} from "@/lib/vehicle-powertrain";
import {
  countRidesThisMonth,
  getEffectivePlan,
  isFreeRideLimitReached,
} from "@/lib/plan-limits";

const platformSchema = z.enum(["uber", "99", "indrive", "particular"]);

const sortSchema = z
  .enum(["recent", "oldest", "gross_desc", "gross_asc"])
  .default("recent");

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
  platform: platformSchema.optional(),
  sort: sortSchema,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const postBodySchema = z.object({
  platform: platformSchema,
  grossAmount: z.number().positive(),
  distanceKm: z.number().positive(),
  startedAt: z.preprocess(
    (v) => {
      if (typeof v === "string" || typeof v === "number")
        return new Date(v);
      return v;
    },
    z.date({ invalid_type_error: "startedAt inválido" }),
  ),
  durationMinutes: z.number().int().positive().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  /** Atualiza o consumo médio (km/l ou km/kWh se elétrico) do veículo junto com o registro. */
  fuelConsumption: z.number().min(2).max(30),
});

function serializeRide(row: typeof rides.$inferSelect) {
  return {
    id: row.id,
    platform: row.platform,
    grossAmount: Number(row.grossAmount),
    distanceKm: Number(row.distanceKm),
    startedAt: row.startedAt.toISOString(),
    durationMinutes: row.durationMinutes,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
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

  const { startDate, endDate, platform, sort, page, limit } = parsed.data;

  return runWithAppUserId(userId, async () => {
  const conditions: SQL[] = [eq(rides.userId, userId)];

  if (startDate && endDate) {
    conditions.push(between(rides.startedAt, startDate, endDate));
  } else if (startDate) {
    conditions.push(gte(rides.startedAt, startDate));
  } else if (endDate) {
    conditions.push(lte(rides.startedAt, endDate));
  }
  if (platform) {
    conditions.push(eq(rides.platform, platform));
  }

  const whereClause = and(...conditions);

  const [countRow] = await getRequestDb()
    .select({ n: count() })
    .from(rides)
    .where(whereClause);
  const total = Number(countRow?.n ?? 0);
  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const offset = (page - 1) * limit;

  const orderByClause =
    sort === "oldest"
      ? asc(rides.startedAt)
      : sort === "gross_desc"
        ? desc(rides.grossAmount)
        : sort === "gross_asc"
          ? asc(rides.grossAmount)
          : desc(rides.startedAt);

  const [vehicleRow] = await getRequestDb()
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .limit(1);

  let summary: {
    totalRides: number;
    totalGross: number;
    totalNetProfit: number | null;
  };

  if (vehicleRow) {
    const [agg] = await getRequestDb()
      .select({
        totalRides: count(),
        totalGross: sql<string>`coalesce(sum(${rides.grossAmount}::numeric), 0)::text`,
        totalNetProfit: sql<string>`coalesce(sum(
          CASE
            WHEN ${rides.distanceKm}::numeric > 0 THEN
              ${rides.grossAmount}::numeric - (
                ${rides.distanceKm}::numeric
                * coalesce(${vehicles.depreciationPerKm}::numeric, 0)
              )
            ELSE 0
          END
        ), 0)::text`,
      })
      .from(rides)
      .innerJoin(vehicles, eq(rides.userId, vehicles.userId))
      .where(whereClause);

    summary = {
      totalRides: Number(agg?.totalRides ?? 0),
      totalGross: Number.parseFloat(agg?.totalGross ?? "0"),
      totalNetProfit: Number.parseFloat(agg?.totalNetProfit ?? "0"),
    };
  } else {
    const [agg] = await getRequestDb()
      .select({
        totalRides: count(),
        totalGross: sql<string>`coalesce(sum(${rides.grossAmount}::numeric), 0)::text`,
      })
      .from(rides)
      .where(whereClause);

    summary = {
      totalRides: Number(agg?.totalRides ?? 0),
      totalGross: Number.parseFloat(agg?.totalGross ?? "0"),
      totalNetProfit: null,
    };
  }

  const rows = await getRequestDb()
    .select()
    .from(rides)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    data: {
      rides: rows.map(serializeRide),
      total,
      page,
      totalPages,
      summary,
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

  const body = postBodySchema.safeParse(json);
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

  return runWithAppUserId(userId, async () => {
  const plan = await getEffectivePlan(userId, email);
  if (plan === "free") {
    const n = await countRidesThisMonth(userId);
    if (isFreeRideLimitReached(n)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "LIMIT_REACHED",
            message:
              "Limite de 50 registros no plano gratuito foi atingido neste mês.",
          },
        },
        { status: 403 },
      );
    }
  }

  const [vehicleRow] = await getRequestDb()
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .limit(1);

  if (!vehicleRow) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "NEED_VEHICLE",
          message: "Cadastre seu veículo antes de registrar corridas.",
        },
      },
      { status: 400 },
    );
  }

  const d = body.data;
  const pt = normalizePowertrain(vehicleRow.powertrain);
  const cBounds = consumptionBounds(pt);
  if (d.fuelConsumption < cBounds.min || d.fuelConsumption > cBounds.max) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message:
            pt === "electric"
              ? `Consumo do dia: entre ${cBounds.min} e ${cBounds.max} km/kWh.`
              : `Consumo do dia: entre ${cBounds.min} e ${cBounds.max} km/l.`,
        },
      },
      { status: 400 },
    );
  }

  const fcStr = d.fuelConsumption.toFixed(2);

  await getRequestDb()
    .update(vehicles)
    .set({ fuelConsumption: fcStr })
    .where(
      and(eq(vehicles.id, vehicleRow.id), eq(vehicles.userId, userId)),
    );

  const [inserted] = await getRequestDb()
    .insert(rides)
    .values({
      userId,
      platform: d.platform,
      grossAmount: d.grossAmount.toFixed(2),
      distanceKm: d.distanceKm.toFixed(2),
      startedAt: d.startedAt,
      durationMinutes: d.durationMinutes ?? null,
      notes: d.notes ?? null,
    })
    .returning();

  const v: Vehicle = {
    ...vehicleFromVehicleRow(vehicleRow),
    fuelConsumption: d.fuelConsumption,
  };
  const cost = calculateRideCost(d.distanceKm, v);
  const profit = Number.isNaN(cost)
    ? Number.NaN
    : calculateRideProfit(d.grossAmount, cost);

  return NextResponse.json({
    data: {
      ride: serializeRide(inserted),
      rideCost: Number.isNaN(cost) ? null : cost,
      profit: Number.isNaN(profit) ? null : profit,
    },
    error: null,
  });
  });
}
