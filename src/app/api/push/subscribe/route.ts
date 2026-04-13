import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { webPushSubscriptions } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import { isWebPushConfigured } from "@/lib/web-push-server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "NOT_CONFIGURED",
          message: "Push não configurado no servidor.",
        },
      },
      { status: 503 },
    );
  }

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
        error: { code: "VALIDATION_ERROR", message: "Dados da inscrição inválidos." },
      },
      { status: 400 },
    );
  }

  const { endpoint, keys } = parsed.data;

  return runWithAppUserId(auth.userId, async () => {
  await getRequestDb()
    .insert(webPushSubscriptions)
    .values({
      userId: auth.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    .onConflictDoUpdate({
      target: webPushSubscriptions.endpoint,
      set: {
        userId: auth.userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ data: { ok: true }, error: null });
  });
}
