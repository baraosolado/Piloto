import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { vehicles } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import {
  consumptionBounds,
  defaultConsumptionStored,
  fuelPriceBounds,
  VEHICLE_POWERTRAINS,
} from "@/lib/vehicle-powertrain";

const MAX_YEAR = new Date().getFullYear() + 1;

const vehicleCoreSchema = z.object({
  model: z.string().min(1),
  year: z.number().int().min(1990).max(MAX_YEAR),
  powertrain: z.enum(VEHICLE_POWERTRAINS).default("combustion"),
  /** Combustão: km/l. Elétrico: km/kWh. Omitido → pré-definido por propulsão. */
  fuelConsumption: z.number().optional(),
  fuelPrice: z.number(),
  currentOdometer: z.number().int().min(0).optional(),
  depreciationPerKm: z.number().min(0).max(5).optional(),
});

function vehiclePayloadRefine(
  data: z.infer<typeof vehicleCoreSchema>,
  ctx: z.RefinementCtx,
) {
  const pt = data.powertrain ?? "combustion";
  const pBounds = fuelPriceBounds(pt);
  if (
    !Number.isFinite(data.fuelPrice) ||
    data.fuelPrice < pBounds.min ||
    data.fuelPrice > pBounds.max
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fuelPrice"],
      message:
        pt === "electric"
          ? `Informe o preço da energia entre R$ ${pBounds.min} e R$ ${pBounds.max} por kWh.`
          : `Informe o preço do combustível entre R$ ${pBounds.min} e R$ ${pBounds.max} por litro.`,
    });
  }
  const cBounds = consumptionBounds(pt);
  const fc = data.fuelConsumption;
  if (fc !== undefined) {
    if (!Number.isFinite(fc) || fc < cBounds.min || fc > cBounds.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fuelConsumption"],
        message:
          pt === "electric"
            ? `Consumo entre ${cBounds.min} e ${cBounds.max} km/kWh.`
            : `Consumo entre ${cBounds.min} e ${cBounds.max} km/l.`,
      });
    }
  }
}

const vehicleBodySchema =
  vehicleCoreSchema.superRefine(vehiclePayloadRefine);

const patchVehicleSchema = vehicleCoreSchema
  .extend({
    depreciationPerKm: z.number().min(0).max(5),
  })
  .superRefine(vehiclePayloadRefine);

export async function POST(request: Request) {
  const authz = await requireSession();
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
    powertrain,
    fuelConsumption: fuelConsumptionOpt,
    fuelPrice,
    currentOdometer,
    depreciationPerKm,
  } = parsed.data;
  const userId = authz.userId;

  const fuelConsumptionStr = (
    fuelConsumptionOpt ?? defaultConsumptionStored(powertrain)
  ).toFixed(2);
  const fuelPriceStr = fuelPrice.toFixed(2);
  const depStr =
    depreciationPerKm !== undefined
      ? depreciationPerKm.toFixed(3)
      : undefined;

  return runWithAppUserId(userId, async () => {
    const [existing] = await getRequestDb()
      .select()
      .from(vehicles)
      .where(eq(vehicles.userId, userId))
      .limit(1);

    let row;
    if (existing) {
      [row] = await getRequestDb()
        .update(vehicles)
        .set({
          model: model.slice(0, 100),
          year,
          powertrain,
          fuelConsumption: fuelConsumptionStr,
          fuelPrice: fuelPriceStr,
          currentOdometer:
            currentOdometer !== undefined
              ? currentOdometer
              : existing.currentOdometer,
          ...(depStr !== undefined ? { depreciationPerKm: depStr } : {}),
        })
        .where(
          and(eq(vehicles.id, existing.id), eq(vehicles.userId, userId)),
        )
        .returning();
    } else {
      [row] = await getRequestDb()
        .insert(vehicles)
        .values({
          userId,
          model: model.slice(0, 100),
          year,
          powertrain,
          fuelConsumption: fuelConsumptionStr,
          fuelPrice: fuelPriceStr,
          currentOdometer: currentOdometer ?? 0,
          ...(depStr !== undefined ? { depreciationPerKm: depStr } : {}),
        })
        .returning();
    }

    return NextResponse.json({ data: row, error: null });
  });
}

export async function PATCH(request: Request) {
  const authz = await requireSession();
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

  const parsed = patchVehicleSchema.safeParse(json);
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
    powertrain,
    fuelConsumption,
    fuelPrice,
    currentOdometer,
    depreciationPerKm,
  } = parsed.data;
  const userId = authz.userId;

  const fuelPriceStr = fuelPrice.toFixed(2);
  const depStr = depreciationPerKm.toFixed(3);

  return runWithAppUserId(userId, async () => {
    const [existing] = await getRequestDb()
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

    const fuelConsumptionStr = (
      fuelConsumption ?? Number(existing.fuelConsumption)
    ).toFixed(2);

    const [row] = await getRequestDb()
      .update(vehicles)
      .set({
        model: model.slice(0, 100),
        year,
        powertrain,
        fuelConsumption: fuelConsumptionStr,
        fuelPrice: fuelPriceStr,
        depreciationPerKm: depStr,
        currentOdometer:
          currentOdometer !== undefined
            ? currentOdometer
            : existing.currentOdometer,
      })
      .where(
        and(eq(vehicles.id, existing.id), eq(vehicles.userId, userId)),
      )
      .returning();

    return NextResponse.json({ data: row, error: null });
  });
}
