import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import {
  createCheckoutSession,
  getPremiumPriceId,
  getStripe,
} from "@/lib/stripe";
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
    const [userRow] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);
    if (!userRow?.email) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION",
            message: "E-mail do usuário não encontrado.",
          },
        },
        { status: 400 },
      );
    }

    const subRow = await ensureSubscriptionRow(auth.userId);
    const stripe = getStripe();

    let customerId = subRow.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRow.email,
        metadata: { userId: auth.userId },
      });
      customerId = customer.id;
      await db
        .update(subscriptions)
        .set({ stripeCustomerId: customerId })
        .where(eq(subscriptions.userId, auth.userId));
    }

    const base = appBaseUrl();
    const priceId = getPremiumPriceId();
    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${base}/dashboard?upgraded=true`,
      cancelUrl: `${base}/planos`,
      userId: auth.userId,
    });

    const url = session.url;
    if (!url) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "STRIPE",
            message: "Checkout sem URL de redirecionamento.",
          },
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ data: { url }, error: null });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Erro ao criar checkout.";
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
