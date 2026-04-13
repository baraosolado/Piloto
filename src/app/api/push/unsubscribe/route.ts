import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { webPushSubscriptions } from "@/db/schema";
import { requireSession } from "@/lib/api-session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  endpoint: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "BAD_REQUEST", message: "Corpo inválido." } },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Endpoint obrigatório." },
      },
      { status: 400 },
    );
  }

  return runWithAppUserId(auth.userId, async () => {
  await getRequestDb()
    .delete(webPushSubscriptions)
    .where(
      and(
        eq(webPushSubscriptions.userId, auth.userId),
        eq(webPushSubscriptions.endpoint, parsed.data.endpoint),
      ),
    );

  return NextResponse.json({ data: { ok: true }, error: null });
  });
}
