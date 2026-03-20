import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";

const MAX_YEAR = new Date().getFullYear() + 1;

const vehicleBodySchema = z.object({
  model: z.string().min(1),
  year: z.number().int().min(1990).max(MAX_YEAR),
  fuelConsumption: z.number().min(3).max(30),
  fuelPrice: z.number().min(3).max(15),
  currentOdometer: z.number().int().min(0).optional(),
  depreciationPerKm: z.number().min(0).max(5).optional(),
});

export async function POST(request: Request) {
  const authz = await getSessionUserId();
  if ("response" in authz) return authz.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "BAD_REQUEST", message: "Corpo da requisição inválido." },
      },
      { status: 400 },
    );
  }

  const parsed = vehicleBodySchema.safeParse(json);
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

  const {
    model,
    year,
    fuelConsumption,
    fuelPrice,
    currentOdometer,
    depreciationPerKm,
  } = parsed.data;
  const userId = authz.userId;

  const fuelConsumptionStr = fuelConsumption.toFixed(2);
  const fuelPriceStr = fuelPrice.toFixed(2);
  const depStr =
    depreciationPerKm !== undefined
      ? depreciationPerKm.toFixed(3)
      : undefined;

  const [existing] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .limit(1);

  let row;
  if (existing) {
    [row] = await db
      .update(vehicles)
      .set({
        model: model.slice(0, 100),
        year,
        fuelConsumption: fuelConsumptionStr,
        fuelPrice: fuelPriceStr,
        currentOdometer:
          currentOdometer !== undefined ? currentOdometer : existing.currentOdometer,
        ...(depStr !== undefined
          ? { depreciationPerKm: depStr }
          : {}),
      })
      .where(
        and(eq(vehicles.id, existing.id), eq(vehicles.userId, userId)),
      )
      .returning();
  } else {
    [row] = await db
      .insert(vehicles)
      .values({
        userId,
        model: model.slice(0, 100),
        year,
        fuelConsumption: fuelConsumptionStr,
        fuelPrice: fuelPriceStr,
        currentOdometer: currentOdometer ?? 0,
        ...(depStr !== undefined
          ? { depreciationPerKm: depStr }
          : {}),
      })
      .returning();
  }

  return NextResponse.json({ data: row, error: null });
}

export async function PATCH(request: Request) {
  const authz = await getSessionUserId();
  if ("response" in authz) return authz.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "BAD_REQUEST", message: "Corpo da requisição inválido." },
      },
      { status: 400 },
    );
  }

  const patchSchema = vehicleBodySchema.extend({
    depreciationPerKm: z.number().min(0).max(5),
  });

  const parsed = patchSchema.safeParse(json);
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

  const {
    model,
    year,
    fuelConsumption,
    fuelPrice,
    currentOdometer,
    depreciationPerKm,
  } = parsed.data;
  const userId = authz.userId;

  const fuelConsumptionStr = fuelConsumption.toFixed(2);
  const fuelPriceStr = fuelPrice.toFixed(2);
  const depStr = depreciationPerKm.toFixed(3);

  const [existing] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Cadastre o veículo no onboarding antes de editar.",
        },
      },
      { status: 404 },
    );
  }

  const [row] = await db
    .update(vehicles)
    .set({
      model: model.slice(0, 100),
      year,
      fuelConsumption: fuelConsumptionStr,
      fuelPrice: fuelPriceStr,
      depreciationPerKm: depStr,
      currentOdometer:
        currentOdometer !== undefined ? currentOdometer : existing.currentOdometer,
    })
    .where(
      and(eq(vehicles.id, existing.id), eq(vehicles.userId, userId)),
    )
    .returning();

  return NextResponse.json({ data: row, error: null });
}
