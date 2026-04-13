import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { rides, vehicles } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import { routeUuidParamSchema } from "@/lib/api-query-validators";
import { calculateRideCost, calculateRideProfit } from "@/lib/calculations";
import {
  consumptionBounds,
  normalizePowertrain,
  vehicleFromVehicleRow,
} from "@/lib/vehicle-powertrain";
import { logIfRideOwnedByOtherUser } from "@/lib/cross-tenant-log";

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
    fuelConsumption: z.number().min(2).max(30).optional(),
  })
  .refine(
    (o) =>
      o.platform !== undefined ||
      o.grossAmount !== undefined ||
      o.distanceKm !== undefined ||
      o.startedAt !== undefined ||
      o.durationMinutes !== undefined ||
      o.notes !== undefined ||
      o.fuelConsumption !== undefined,
    { message: "Nenhum campo para atualizar." },
  );

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
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const { id } = await context.params;
  const idParsed = routeUuidParamSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION", message: "ID inválido." },
      },
      { status: 400 },
    );
  }

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

  return runWithAppUserId(userId, async () => {
  const [existing] = await getRequestDb()
    .select()
    .from(rides)
    .where(and(eq(rides.id, idParsed.data), eq(rides.userId, userId)))
    .limit(1);

  if (!existing) {
    await logIfRideOwnedByOtherUser(idParsed.data, userId);
    return NextResponse.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Registro não encontrado." },
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

  let updated: typeof rides.$inferSelect;
  if (p.fuelConsumption !== undefined) {
    const [vehForConsumption] = await getRequestDb()
      .select()
      .from(vehicles)
      .where(eq(vehicles.userId, userId))
      .limit(1);
    if (vehForConsumption) {
      const pt = normalizePowertrain(vehForConsumption.powertrain);
      const cBounds = consumptionBounds(pt);
      if (
        p.fuelConsumption < cBounds.min ||
        p.fuelConsumption > cBounds.max
      ) {
        return NextResponse.json(
          {
            data: null,
            error: {
              code: "VALIDATION_ERROR",
              message:
                pt === "electric"
                  ? `Consumo entre ${cBounds.min} e ${cBounds.max} km/kWh.`
                  : `Consumo entre ${cBounds.min} e ${cBounds.max} km/l.`,
            },
          },
          { status: 400 },
        );
      }
    }
    await getRequestDb()
      .update(vehicles)
      .set({ fuelConsumption: p.fuelConsumption.toFixed(2) })
      .where(eq(vehicles.userId, userId));
  }

  if (Object.keys(updatePayload).length > 0) {
    const [row] = await getRequestDb()
      .update(rides)
      .set(updatePayload)
      .where(and(eq(rides.id, idParsed.data), eq(rides.userId, userId)))
      .returning();
    updated = row ?? existing;
  } else {
    updated = existing;
  }

  const [vehicleRow] = await getRequestDb()
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .limit(1);

  let rideCost: number | null = null;
  let profit: number | null = null;
  if (vehicleRow) {
    const v = vehicleFromVehicleRow(vehicleRow);
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
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Params },
) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const { id } = await context.params;
  const idParsed = routeUuidParamSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION", message: "ID inválido." },
      },
      { status: 400 },
    );
  }

  return runWithAppUserId(userId, async () => {
  const deleted = await getRequestDb()
    .delete(rides)
    .where(and(eq(rides.id, idParsed.data), eq(rides.userId, userId)))
    .returning({ id: rides.id });

  if (deleted.length === 0) {
    await logIfRideOwnedByOtherUser(idParsed.data, userId);
    return NextResponse.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Registro não encontrado." },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { id: deleted[0].id }, error: null });
  });
}
