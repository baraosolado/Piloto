import { NextResponse } from "next/server";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { getAppBaseUrl } from "@/lib/app-base-url";
import { requireSession } from "@/lib/api-session";
import {
  createPortalSession,
  getStripe,
  getStripeErrorMessage,
} from "@/lib/stripe";
import { ensureSubscriptionRow } from "@/lib/subscriptions-repo";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  try {
    return await runWithAppUserId(auth.userId, async () => {
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

    const base = getAppBaseUrl();
    const portal = await createPortalSession(
      subRow.stripeCustomerId,
      `${base}/configuracoes/plano`,
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
    });
  } catch (e) {
    const raw = getStripeErrorMessage(e);
    const isConfig =
      raw.includes("não está configurada") ||
      raw.includes("obrigatório") ||
      raw.includes("protocolo");
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
