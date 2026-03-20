import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { maintenanceItems } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { getVehicleForUser } from "@/lib/dashboard-data";
import { serializeMaintenanceItem } from "@/lib/maintenance-serialize";

const patchBodySchema = z
  .object({
    type: z.string().trim().min(1).max(100).optional(),
    lastServiceKm: z.number().int().min(0).optional(),
    lastServiceAt: z.preprocess(
      (v) => {
        if (v === undefined) return undefined;
        if (typeof v === "string" || typeof v === "number")
          return new Date(v);
        return v;
      },
      z.date().optional(),
    ),
    intervalKm: z.number().int().min(1).optional(),
    estimatedCost: z.number().positive().nullable().optional(),
  })
  .refine(
    (o) =>
      o.type !== undefined ||
      o.lastServiceKm !== undefined ||
      o.lastServiceAt !== undefined ||
      o.intervalKm !== undefined ||
      o.estimatedCost !== undefined,
    { message: "Nenhum campo para atualizar." },
  );

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
    .from(maintenanceItems)
    .where(
      and(
        eq(maintenanceItems.id, id),
        eq(maintenanceItems.userId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Item não encontrado." },
      },
      { status: 404 },
    );
  }

  const p = parsed.data;
  const updatePayload: Partial<typeof maintenanceItems.$inferInsert> = {};
  if (p.type !== undefined) updatePayload.type = p.type;
  if (p.lastServiceKm !== undefined)
    updatePayload.lastServiceKm = p.lastServiceKm;
  if (p.lastServiceAt !== undefined)
    updatePayload.lastServiceAt = p.lastServiceAt;
  if (p.intervalKm !== undefined) updatePayload.intervalKm = p.intervalKm;
  if (p.estimatedCost !== undefined) {
    updatePayload.estimatedCost =
      p.estimatedCost === null ? null : p.estimatedCost.toFixed(2);
  }

  const [updated] = await db
    .update(maintenanceItems)
    .set(updatePayload)
    .where(
      and(
        eq(maintenanceItems.id, id),
        eq(maintenanceItems.userId, userId),
      ),
    )
    .returning();

  const vehicle = await getVehicleForUser(userId);
  const currentOdometer =
    vehicle !== null ? vehicle.currentOdometer : null;

  return NextResponse.json({
    data: {
      item: serializeMaintenanceItem(updated, currentOdometer),
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
    .delete(maintenanceItems)
    .where(
      and(
        eq(maintenanceItems.id, id),
        eq(maintenanceItems.userId, userId),
      ),
    )
    .returning({ id: maintenanceItems.id });

  if (deleted.length === 0) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Item não encontrado." },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { id: deleted[0].id }, error: null });
}
