import Stripe from "stripe";

let stripeClient: Stripe | null = null;

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

export function getPremiumPriceId(): string {
  const id = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!id?.trim()) {
    throw new Error("STRIPE_PREMIUM_PRICE_ID não está configurada");
  }
  return id.trim();
}

export type CreateCheckoutSessionParams = {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
};

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
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
