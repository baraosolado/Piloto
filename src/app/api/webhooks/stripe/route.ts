import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, getSubscription } from "@/lib/stripe";
import {
  downgradeToFreeForUser,
  getSubscriptionByStripeSubscriptionId,
  upsertPremiumFromCheckout,
} from "@/lib/subscriptions-repo";

export const runtime = "nodejs";

/** Mantém acesso conforme PRD: falha de pagamento ainda premium até resolução/cancelamento. */
function subscriptionGrantsPremium(sub: Stripe.Subscription): boolean {
  switch (sub.status) {
    case "active":
    case "trialing":
    case "past_due":
    case "unpaid":
      return true;
    default:
      return false;
  }
}

async function resolveUserIdFromSubscription(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const fromMeta = sub.metadata?.userId?.trim();
  if (fromMeta) return fromMeta;
  const row = await getSubscriptionByStripeSubscriptionId(sub.id);
  return row?.userId ?? null;
}

function customerIdOf(sub: Stripe.Subscription): string {
  const c = sub.customer;
  return typeof c === "string" ? c : c.id;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET não configurado" },
      { status: 500 },
    );
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY não configurada" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId =
          session.metadata?.userId?.trim() ??
          session.client_reference_id?.trim();
        const customerRaw = session.customer;
        const customerId =
          typeof customerRaw === "string"
            ? customerRaw
            : customerRaw?.id ?? null;
        const subRaw = session.subscription;
        const subscriptionId =
          typeof subRaw === "string" ? subRaw : subRaw?.id ?? null;

        if (!userId || !customerId || !subscriptionId) {
          console.warn(
            "[stripe webhook] checkout.session.completed: faltando userId, customer ou subscription",
          );
          break;
        }

        const sub = await getSubscription(subscriptionId);
        await upsertPremiumFromCheckout({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(sub);
        if (!userId) {
          console.warn(
            "[stripe webhook] customer.subscription.updated: userId não resolvido",
            sub.id,
          );
          break;
        }

        if (subscriptionGrantsPremium(sub)) {
          await upsertPremiumFromCheckout({
            userId,
            stripeCustomerId: customerIdOf(sub),
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          });
        } else {
          await downgradeToFreeForUser(userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          sub.metadata?.userId?.trim() ??
          (await getSubscriptionByStripeSubscriptionId(sub.id))?.userId;
        if (userId) {
          await downgradeToFreeForUser(userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        if (process.env.NODE_ENV === "development") {
          const inv = event.data.object as Stripe.Invoice;
          console.warn(
            "[stripe webhook] invoice.payment_failed (premium mantido)",
            inv.id,
          );
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook]", event.type, e);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
