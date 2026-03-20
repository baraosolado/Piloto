import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { rides, vehicles } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import {
  calculateRideCost,
  calculateRideProfit,
  type Vehicle,
} from "@/lib/calculations";

const platformSchema = z.enum(["uber", "99", "indrive", "particular"]);

const patchBodySchema = z
  .object({
    platform: platformSchema.optional(),
    grossAmount: z.number().positive().optional(),
    distanceKm: z.number().positive().optional(),
    startedAt: z.preprocess(
      (v) => {
        if (v === undefined) return undefined;
        if (typeof v === "string" || typeof v === "number")
          return new Date(v);
        return v;
      },
      z.date().optional(),
    ),
    durationMinutes: z.number().int().positive().nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .refine(
    (o) =>
      o.platform !== undefined ||
      o.grossAmount !== undefined ||
      o.distanceKm !== undefined ||
      o.startedAt !== undefined ||
      o.durationMinutes !== undefined ||
      o.notes !== undefined,
    { message: "Nenhum campo para atualizar." },
  );

function vehicleRowToCalc(v: typeof vehicles.$inferSelect): Vehicle {
  return {
    fuelConsumption: Number(v.fuelConsumption),
    fuelPrice: Number(v.fuelPrice),
    depreciationPerKm: Number(v.depreciationPerKm),
  };
}

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

type Params = Promise<{ id: string }>;

export async function PATCH(
  request: Request,
  context: { params: Params },
) {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const { id } = await context.params;

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

  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
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

  const [existing] = await db
    .select()
    .from(rides)
    .where(and(eq(rides.id, id), eq(rides.userId, userId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Corrida não encontrada." },
      },
      { status: 404 },
    );
  }

  const p = parsed.data;
  const updatePayload: Partial<typeof rides.$inferInsert> = {};
  if (p.platform !== undefined) updatePayload.platform = p.platform;
  if (p.grossAmount !== undefined)
    updatePayload.grossAmount = p.grossAmount.toFixed(2);
  if (p.distanceKm !== undefined)
    updatePayload.distanceKm = p.distanceKm.toFixed(2);
  if (p.startedAt !== undefined) updatePayload.startedAt = p.startedAt;
  if (p.durationMinutes !== undefined)
    updatePayload.durationMinutes = p.durationMinutes;
  if (p.notes !== undefined) updatePayload.notes = p.notes;

  const [updated] = await db
    .update(rides)
    .set(updatePayload)
    .where(and(eq(rides.id, id), eq(rides.userId, userId)))
    .returning();

  const [vehicleRow] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .limit(1);

  let rideCost: number | null = null;
  let profit: number | null = null;
  if (vehicleRow) {
    const v = vehicleRowToCalc(vehicleRow);
    const km = Number(updated.distanceKm);
    const gross = Number(updated.grossAmount);
    const c = calculateRideCost(km, v);
    rideCost = Number.isNaN(c) ? null : c;
    profit =
      rideCost === null ? null : calculateRideProfit(gross, rideCost);
  }

  return NextResponse.json({
    data: {
      ride: serializeRide(updated),
      rideCost,
      profit,
    },
    error: null,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Params },
) {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const { id } = await context.params;

  const deleted = await db
    .delete(rides)
    .where(and(eq(rides.id, id), eq(rides.userId, userId)))
    .returning({ id: rides.id });

  if (deleted.length === 0) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Corrida não encontrada." },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { id: deleted[0].id }, error: null });
}
