import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { maintenanceItems } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { getVehicleForUser } from "@/lib/dashboard-data";
import { sumProvisionPerKm } from "@/lib/maintenance-computed";
import { serializeMaintenanceItem } from "@/lib/maintenance-serialize";

const postBodySchema = z.object({
  type: z.string().trim().min(1).max(100),
  lastServiceKm: z.number().int().min(0),
  lastServiceAt: z.preprocess(
    (v) => {
      if (typeof v === "string" || typeof v === "number") return new Date(v);
      return v;
    },
    z.date({ invalid_type_error: "lastServiceAt inválido" }),
  ),
  intervalKm: z.number().int().min(1),
  estimatedCost: z.number().positive().nullable().optional(),
});

export async function GET() {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const vehicle = await getVehicleForUser(userId);
  const currentOdometer =
    vehicle !== null ? vehicle.currentOdometer : null;

  const rows = await db
    .select()
    .from(maintenanceItems)
    .where(eq(maintenanceItems.userId, userId))
    .orderBy(asc(maintenanceItems.type));

  const items = rows.map((r) =>
    serializeMaintenanceItem(r, currentOdometer),
  );
  const provisionPerKm = sumProvisionPerKm(
    rows.map((r) => ({
      estimatedCost:
        r.estimatedCost !== null ? Number(r.estimatedCost) : null,
      intervalKm: r.intervalKm,
    })),
  );

  return NextResponse.json({
    data: {
      items,
      currentOdometer,
      provisionPerKm,
    },
    error: null,
  });
}

export async function POST(request: Request) {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

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

  const parsed = postBodySchema.safeParse(json);
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

  const d = parsed.data;
  const [inserted] = await db
    .insert(maintenanceItems)
    .values({
      userId,
      type: d.type,
      lastServiceKm: d.lastServiceKm,
      lastServiceAt: d.lastServiceAt,
      intervalKm: d.intervalKm,
      estimatedCost:
        d.estimatedCost !== undefined && d.estimatedCost !== null
          ? d.estimatedCost.toFixed(2)
          : null,
    })
    .returning();

  const vehicle = await getVehicleForUser(userId);
  const currentOdometer =
    vehicle !== null ? vehicle.currentOdometer : null;

  return NextResponse.json({
    data: {
      item: serializeMaintenanceItem(inserted, currentOdometer),
    },
    error: null,
  });
}
