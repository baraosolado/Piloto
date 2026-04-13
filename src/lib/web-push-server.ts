import { loadEnvConfig } from "@next/env";
import webpush from "web-push";

/** Garante .env / .env.local no process.env (em alguns momentos o módulo roda antes do merge padrão). */
try {
  loadEnvConfig(process.cwd());
} catch {
  /* ex.: build sem filesystem */
}

function pickEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const raw = process.env[name];
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (v.length > 0) return v;
  }
  return undefined;
}

function vapidPublicKey(): string | undefined {
  return pickEnv("VAPID_PUBLIC_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY");
}

function vapidPrivateKey(): string | undefined {
  return pickEnv("VAPID_PRIVATE_KEY");
}

function vapidSubject(): string | undefined {
  return pickEnv("VAPID_SUBJECT");
}

export const MAINTENANCE_PUSH_COOLDOWN_MS = 20 * 60 * 60 * 1000;

export function isWebPushConfigured(): boolean {
  return Boolean(
    vapidPublicKey() && vapidPrivateKey() && vapidSubject(),
  );
}

export function getVapidPublicKey(): string | null {
  const k = vapidPublicKey();
  return k ?? null;
}

let configured = false;

export function ensureWebPushConfigured(): void {
  if (configured) return;
  const subject = vapidSubject();
  const publicKey = vapidPublicKey();
  const privateKey = vapidPrivateKey();
  if (!subject || !publicKey || !privateKey) {
    throw new Error("VAPID não configurado (VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Path relativo (ex.: /manutencao) */
  url?: string;
  /** Evita substituir notificação anterior com a mesma tag. */
  tag?: string;
  /** Mantém o banner até o usuário dispensar (útil em teste / Windows). */
  requireInteraction?: boolean;
};

export async function sendWebPushToSubscription(
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; statusCode?: number; gone: boolean }> {
  ensureWebPushConfigured();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/manutencao",
    ...(payload.tag ? { tag: payload.tag } : {}),
    ...(payload.requireInteraction === true
      ? { requireInteraction: true }
      : {}),
  });
  try {
    await webpush.sendNotification(subscription, body, {
      TTL: 86_400,
      urgency: "normal",
    });
    return { ok: true };
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === "object" && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : undefined;
    const gone = statusCode === 404 || statusCode === 410;
    return { ok: false, statusCode, gone };
  }
}
