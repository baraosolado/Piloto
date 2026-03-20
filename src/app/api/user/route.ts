import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";

export async function DELETE() {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;

  await db.delete(users).where(eq(users.id, auth.userId));

  return NextResponse.json(
    { data: { ok: true }, error: null },
    { status: 200 },
  );
}
