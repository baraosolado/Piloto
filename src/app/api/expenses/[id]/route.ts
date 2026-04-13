import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { expenses, vehicles } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import { fuelExpenseUi, normalizePowertrain } from "@/lib/vehicle-powertrain";
import { routeUuidParamSchema } from "@/lib/api-query-validators";
import { logIfExpenseOwnedByOtherUser } from "@/lib/cross-tenant-log";

const categorySchema = z.enum([
  "fuel",
  "maintenance",
  "insurance",
  "fine",
  "other",
]);

const patchBodySchema = z
  .object({
    category: categorySchema.optional(),
    amount: z.number().positive().optional(),
    odometer: z.number().int().min(0).nullable().optional(),
    liters: z.number().positive().nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    occurredAt: z.preprocess(
      (v) => {
        if (v === undefined) return undefined;
        if (typeof v === "string" || typeof v === "number")
          return new Date(v);
        return v;
      },
      z.date().optional(),
    ),
  })
  .refine(
    (o) =>
      o.category !== undefined ||
      o.amount !== undefined ||
      o.odometer !== undefined ||
      o.liters !== undefined ||
      o.description !== undefined ||
      o.occurredAt !== undefined,
    { message: "Nenhum campo para atualizar." },
  );

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
    .from(expenses)
    .where(and(eq(expenses.id, idParsed.data), eq(expenses.userId, userId)))
    .limit(1);

  if (!existing) {
    await logIfExpenseOwnedByOtherUser(idParsed.data, userId);
    return NextResponse.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Gasto não encontrado." },
      },
      { status: 404 },
    );
  }

  const p = parsed.data;
  const effectiveCategory = p.category ?? existing.category;

  if (effectiveCategory === "fuel") {
    const [vRow] = await getRequestDb()
      .select({ powertrain: vehicles.powertrain })
      .from(vehicles)
      .where(eq(vehicles.userId, userId))
      .limit(1);
    const fuelUi = fuelExpenseUi(normalizePowertrain(vRow?.powertrain));

    const nextOdometer =
      p.odometer !== undefined ? p.odometer : existing.odometer;
    if (nextOdometer === null || nextOdometer === undefined) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: fuelUi.apiOdometerRequired,
          },
        },
        { status: 400 },
      );
    }
    const nextLiters =
      p.liters !== undefined
        ? p.liters
        : existing.liters !== null
          ? Number(existing.liters)
          : null;
    if (
      nextLiters === null ||
      nextLiters === undefined ||
      !(nextLiters > 0)
    ) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: fuelUi.apiVolumeRequired,
          },
        },
        { status: 400 },
      );
    }
  }

  const updatePayload: Partial<typeof expenses.$inferInsert> = {};
  if (p.category !== undefined) updatePayload.category = p.category;
  if (p.amount !== undefined) updatePayload.amount = p.amount.toFixed(2);
  if (p.odometer !== undefined) updatePayload.odometer = p.odometer;
  if (p.liters !== undefined) {
    updatePayload.liters =
      p.liters === null ? null : p.liters.toFixed(2);
  }
  if (p.description !== undefined) updatePayload.description = p.description;
  if (p.occurredAt !== undefined) updatePayload.occurredAt = p.occurredAt;

  const [updated] = await getRequestDb()
    .update(expenses)
    .set(updatePayload)
    .where(and(eq(expenses.id, idParsed.data), eq(expenses.userId, userId)))
    .returning();

  if (!updated) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL", message: "Falha ao atualizar." },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: { expense: serializeExpense(updated) },
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
    .delete(expenses)
    .where(and(eq(expenses.id, idParsed.data), eq(expenses.userId, userId)))
    .returning({ id: expenses.id });

  if (deleted.length === 0) {
    await logIfExpenseOwnedByOtherUser(idParsed.data, userId);
    return NextResponse.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Gasto não encontrado." },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { id: deleted[0].id }, error: null });
  });
}
