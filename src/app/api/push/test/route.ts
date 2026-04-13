import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { webPushSubscriptions } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import {
  isWebPushConfigured,
  sendWebPushToSubscription,
} from "@/lib/web-push-server";

export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "NOT_AVAILABLE",
          message: "Teste de push só está disponível em desenvolvimento.",
        },
      },
      { status: 403 },
    );
  }

  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "NOT_CONFIGURED", message: "Push não configurado." },
      },
      { status: 503 },
    );
  }

  return runWithAppUserId(auth.userId, async () => {
  const subs = await getRequestDb()
    .select()
    .from(webPushSubscriptions)
    .where(eq(webPushSubscriptions.userId, auth.userId));

  if (subs.length === 0) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "NO_SUBSCRIPTION",
          message: "Ative as notificações neste dispositivo antes do teste.",
        },
      },
      { status: 400 },
    );
  }

  let sent = 0;
  for (const row of subs) {
    const r = await sendWebPushToSubscription(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      {
        title: "Copilote — teste",
        body: "Notificação de teste. Se não viu o banner, abra o Centro de notificações do Windows (ícone de balão na barra de tarefas).",
        url: "/manutencao",
        tag: `copilote-test-${Date.now()}`,
        requireInteraction: true,
      },
    );
    if (r.ok) sent += 1;
  }

  if (sent === 0) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "SEND_FAILED",
          message: "Não foi possível enviar (verifique permissões do navegador).",
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    data: { sent },
    error: null,
  });
  });
}
