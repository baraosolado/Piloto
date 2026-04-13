import Stripe from "stripe";
import { PREMIUM_TRIAL_DAYS } from "@/lib/pricing";

let stripeClient: Stripe | null = null;

/** Mensagem legível para logs e JSON de erro em desenvolvimento. */
export function getStripeErrorMessage(e: unknown): string {
  if (e instanceof Stripe.errors.StripeError) {
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return "Erro desconhecido.";
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.trim()) {
    throw new Error("STRIPE_SECRET_KEY não está configurada");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeClient;
}

export type StripeBillingPeriod = "monthly" | "yearly";

/** Preço mensal recorrente (price_...) — preferência por STRIPE_PREMIUM_PRICE_ID_MONTHLY. */
export function getPremiumMonthlyPriceId(): string {
  const id =
    process.env.STRIPE_PREMIUM_PRICE_ID_MONTHLY?.trim() ||
    process.env.STRIPE_PREMIUM_PRICE_ID?.trim();
  if (!id) {
    throw new Error(
      "STRIPE_PREMIUM_PRICE_ID_MONTHLY (ou STRIPE_PREMIUM_PRICE_ID legado) não está configurada",
    );
  }
  return id;
}

/** Preço anual recorrente (price_...), se configurado. */
export function getPremiumYearlyPriceId(): string | null {
  const id = process.env.STRIPE_PREMIUM_PRICE_ID_YEARLY?.trim();
  return id || null;
}

export function checkoutPriceIdForBillingPeriod(
  period: StripeBillingPeriod,
): string {
  if (period === "yearly") {
    const y = getPremiumYearlyPriceId();
    if (!y) {
      throw new Error("STRIPE_PREMIUM_PRICE_ID_YEARLY não está configurada");
    }
    return y;
  }
  return getPremiumMonthlyPriceId();
}

/** @deprecated use {@link getPremiumMonthlyPriceId} */
export function getPremiumPriceId(): string {
  return getPremiumMonthlyPriceId();
}

export type CreateCheckoutSessionParams = {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  /** Dias de trial antes da primeira cobrança (default: {@link PREMIUM_TRIAL_DAYS}). */
  trialPeriodDays?: number;
  /**
   * Garante que o Price no Stripe tem o intervalo esperado (evita trocar mensal/anual no `.env`).
   * Mensal → `"month"`; anual → `"year"` (nome da API Stripe).
   */
  expectedRecurringInterval?: Stripe.Price.Recurring.Interval;
};

/**
 * Checkout em `mode: subscription` exige um Price **recorrente** (mensal/anual).
 * Pagamento único (`one_time`) ou ID de produto (`prod_...`) gera erro opaco do Stripe.
 */
async function assertRecurringSubscriptionPrice(
  stripe: Stripe,
  priceId: string,
  expectedInterval?: Stripe.Price.Recurring.Interval,
): Promise<void> {
  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch {
    throw new Error(
      `Não foi possível carregar o preço "${priceId}". Confira se é um price_... da mesma conta Stripe da STRIPE_SECRET_KEY (teste vs produção).`,
    );
  }
  if (price.type !== "recurring" || !price.recurring) {
    throw new Error(
      "O Price configurado em STRIPE_PREMIUM_PRICE_ID_MONTHLY / YEARLY / legado não é uma assinatura recorrente. No Stripe, crie um preço com modelo \"Recurring\" (cobrança mensal ou anual), copie o ID price_... e não use preço de pagamento único nem o ID do produto (prod_...).",
    );
  }
  if (
    expectedInterval &&
    price.recurring.interval !== expectedInterval
  ) {
    const want =
      expectedInterval === "year"
        ? "anual (intervalo \"year\" no Stripe)"
        : "mensal (intervalo \"month\")";
    const got = price.recurring.interval;
    throw new Error(
      `Este price_... não é ${want}: no Stripe está configurado como \"${got}\". Ajuste o ID em STRIPE_PREMIUM_PRICE_ID_${expectedInterval === "year" ? "YEARLY" : "MONTHLY"} ou crie outro preço com o intervalo certo.`,
    );
  }
}

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  await assertRecurringSubscriptionPrice(
    stripe,
    params.priceId,
    params.expectedRecurringInterval,
  );
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: params.customerId,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    metadata: { userId: params.userId },
    subscription_data: {
      metadata: { userId: params.userId },
      trial_period_days:
        params.trialPeriodDays !== undefined
          ? params.trialPeriodDays
          : PREMIUM_TRIAL_DAYS,
    },
    allow_promotion_codes: true,
  });
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function getSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/** Últimos 4 dígitos do cartão padrão do customer, se existir. */
export async function getCustomerCardLast4(
  customerId: string,
): Promise<string | null> {
  try {
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if (customer.deleted) return null;
    const pm = customer.invoice_settings?.default_payment_method;
    if (!pm || typeof pm === "string") return null;
    if (pm.object === "payment_method" && pm.card?.last4) {
      return pm.card.last4;
    }
    return null;
  } catch {
    return null;
  }
}
