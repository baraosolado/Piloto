import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { platformsUsed } from "@/db/schema";
import { requireSession } from "@/lib/api-session";

const platformIdSchema = z.enum(["uber", "99", "indrive", "particular"]);

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const userId = auth.userId;
  return runWithAppUserId(userId, async () => {
    const gdb = getRequestDb();
    const rows = await gdb
      .select({ platform: platformsUsed.platform })
      .from(platformsUsed)
      .where(eq(platformsUsed.userId, userId));
    return NextResponse.json({
      data: { platforms: rows.map((r) => r.platform) },
      error: null,
    });
  });
}

const bodySchema = z.object({
  platforms: z
    .array(platformIdSchema)
    .min(1, "Selecione pelo menos uma plataforma."),
});

export async function POST(request: Request) {
  const auth = await requireSession();
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

  return runWithAppUserId(userId, async () => {
    const gdb = getRequestDb();
    await gdb.delete(platformsUsed).where(eq(platformsUsed.userId, userId));
    const rows =
      uniquePlatforms.length === 0
        ? []
        : await gdb
            .insert(platformsUsed)
            .values(uniquePlatforms.map((platform) => ({ userId, platform })))
            .returning();

    return NextResponse.json({ data: { platforms: rows }, error: null });
  });
}
