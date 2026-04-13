import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { subscriptions, users } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import { PREMIUM_TRIAL_DAYS } from "@/lib/pricing";
import { getAppBaseUrl } from "@/lib/app-base-url";
import {
  checkoutPriceIdForBillingPeriod,
  createCheckoutSession,
  getPremiumYearlyPriceId,
  getStripe,
  getStripeErrorMessage,
  type StripeBillingPeriod,
} from "@/lib/stripe";
import { ensureSubscriptionRow } from "@/lib/subscriptions-repo";

export const runtime = "nodejs";

const bodySchema = z.object({
  billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    rawBody = {};
  }
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION",
          message: first?.message ?? "Dados inválidos.",
        },
      },
      { status: 400 },
    );
  }

  const billingPeriod: StripeBillingPeriod = parsed.data.billingPeriod;
  if (billingPeriod === "yearly" && !getPremiumYearlyPriceId()) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION",
          message:
            "Plano anual não está disponível. Configure STRIPE_PREMIUM_PRICE_ID_YEARLY.",
        },
      },
      { status: 400 },
    );
  }

  try {
    return await runWithAppUserId(auth.userId, async () => {
    const [userRow] = await getRequestDb()
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
      await getRequestDb()
        .update(subscriptions)
        .set({ stripeCustomerId: customerId })
        .where(eq(subscriptions.userId, auth.userId));
    }

    const base = getAppBaseUrl();
    const priceId = checkoutPriceIdForBillingPeriod(billingPeriod);
    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${base}/configuracoes/plano?checkout=success`,
      cancelUrl: `${base}/configuracoes/plano`,
      userId: auth.userId,
      trialPeriodDays: PREMIUM_TRIAL_DAYS,
      expectedRecurringInterval:
        billingPeriod === "yearly" ? "year" : "month",
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
