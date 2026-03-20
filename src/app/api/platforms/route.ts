import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { platformsUsed } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";

const platformIdSchema = z.enum(["uber", "99", "indrive", "particular"]);

const bodySchema = z.object({
  platforms: z
    .array(platformIdSchema)
    .min(1, "Selecione pelo menos uma plataforma."),
});

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
        error: {
          code: "BAD_REQUEST",
          message: "Corpo da requisição inválido.",
        },
      },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
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

  const userId = auth.userId;
  const uniquePlatforms = [...new Set(parsed.data.platforms)];

  const rows = await db.transaction(async (tx) => {
    await tx.delete(platformsUsed).where(eq(platformsUsed.userId, userId));
    if (uniquePlatforms.length === 0) return [];
    return tx
      .insert(platformsUsed)
      .values(uniquePlatforms.map((platform) => ({ userId, platform })))
      .returning();
  });

  return NextResponse.json({ data: { platforms: rows }, error: null });
}
