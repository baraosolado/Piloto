import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/api-session";

export async function DELETE() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  return runWithAppUserId(auth.userId, async () => {
  await getRequestDb().delete(users).where(eq(users.id, auth.userId));

  return NextResponse.json(
    { data: { ok: true }, error: null },
    { status: 200 },
  );
  });
}
