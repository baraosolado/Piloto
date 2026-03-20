import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api-session";
import { createPortalSession, getStripe } from "@/lib/stripe";
import { ensureSubscriptionRow } from "@/lib/subscriptions-repo";

export const runtime = "nodejs";

function appBaseUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim();
  if (!u) {
    throw new Error("NEXT_PUBLIC_APP_URL ou BETTER_AUTH_URL é obrigatório");
  }
  return u.replace(/\/$/, "");
}

export async function POST() {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;

  try {
    void getStripe();
    const subRow = await ensureSubscriptionRow(auth.userId);
    if (!subRow.stripeCustomerId) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION",
            message: "Nenhuma assinatura Stripe vinculada a esta conta.",
          },
        },
        { status: 400 },
      );
    }

    const base = appBaseUrl();
    const portal = await createPortalSession(
      subRow.stripeCustomerId,
      `${base}/planos`,
    );
    const url = portal.url;
    if (!url) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "STRIPE",
            message: "Portal sem URL de retorno.",
          },
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ data: { url }, error: null });
  } catch (e) {
    const raw =
      e instanceof Error ? e.message : "Erro ao abrir portal de cobrança.";
    const isConfig =
      raw.includes("não está configurada") || raw.includes("obrigatório");
    const message =
      process.env.NODE_ENV === "production"
        ? "Erro ao processar pagamento. Tente novamente."
        : raw;
    return NextResponse.json(
      { data: null, error: { code: "STRIPE", message } },
      { status: isConfig ? 503 : 500 },
    );
  }
}
