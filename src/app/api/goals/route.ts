import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";

const postBodySchema = z.object({
  monthlyTarget: z
    .number()
    .min(500, "Mínimo R$ 500")
    .max(50_000, "Máximo R$ 50.000"),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(1990).max(2100).optional(),
});

function serializeGoal(row: typeof goals.$inferSelect) {
  return {
    id: row.id,
    month: row.month,
    year: row.year,
    monthlyTarget: Number(row.monthlyTarget),
    achieved: row.achieved,
  };
}

export async function GET() {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const rows = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId));

  return NextResponse.json({
    data: { goals: rows.map(serializeGoal) },
    error: null,
  });
}

export async function POST(request: Request) {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;

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

  const now = new Date();
  const month = parsed.data.month ?? now.getUTCMonth() + 1;
  const year = parsed.data.year ?? now.getUTCFullYear();
  const monthlyTargetStr = parsed.data.monthlyTarget.toFixed(2);
  const userId = auth.userId;

  const [existing] = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.month, month),
        eq(goals.year, year),
      ),
    )
    .limit(1);

  let row: typeof goals.$inferSelect;
  if (existing) {
    [row] = await db
      .update(goals)
      .set({ monthlyTarget: monthlyTargetStr })
      .where(
        and(eq(goals.id, existing.id), eq(goals.userId, userId)),
      )
      .returning();
  } else {
    [row] = await db
      .insert(goals)
      .values({
        userId,
        monthlyTarget: monthlyTargetStr,
        month,
        year,
      })
      .returning();
  }

  return NextResponse.json({
    data: { goal: serializeGoal(row) },
    error: null,
  });
}
