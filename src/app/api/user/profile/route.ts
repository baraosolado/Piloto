import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";

const profileSchema = z.object({
  name: z.string().min(1, "Informe o nome").max(255),
  city: z.string().max(100).optional().nullable(),
});

export async function PATCH(request: Request) {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;

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

  const parsed = profileSchema.safeParse(json);
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

  const cityVal =
    parsed.data.city === undefined || parsed.data.city === null
      ? null
      : parsed.data.city.trim() === ""
        ? null
        : parsed.data.city.trim().slice(0, 100);

  const [updated] = await db
    .update(users)
    .set({
      name: parsed.data.name.trim().slice(0, 255),
      city: cityVal,
    })
    .where(eq(users.id, auth.userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      city: users.city,
    });

  return NextResponse.json({ data: updated, error: null });
}
