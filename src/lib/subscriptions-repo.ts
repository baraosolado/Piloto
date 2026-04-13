import { eq } from "drizzle-orm";
import { pool } from "@/db";
import { getRequestDb } from "@/db/request-db";
import { subscriptions } from "@/db/schema";

export type SubscriptionRow = typeof subscriptions.$inferSelect;

type SubscriptionRpcRow = {
  id: string;
  user_id: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  created_at: Date;
};

function subscriptionFromRpcRow(r: SubscriptionRpcRow): SubscriptionRow {
  return {
    id: r.id,
    userId: r.user_id,
    plan: r.plan as SubscriptionRow["plan"],
    stripeCustomerId: r.stripe_customer_id,
    stripeSubscriptionId: r.stripe_subscription_id,
    currentPeriodEnd: r.current_period_end,
    cancelAtPeriodEnd: r.cancel_at_period_end,
    createdAt: r.created_at,
  };
}

export async function getSubscriptionByUserId(
  userId: string,
): Promise<SubscriptionRow | null> {
  const [row] = await getRequestDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Lookup por Stripe fora do contexto `app.current_user_id` (webhook).
 * Usa função SECURITY DEFINER na migração `0008_enable_row_level_security.sql`.
 */
export async function getSubscriptionByStripeSubscriptionId(
  stripeSubscriptionId: string,
): Promise<SubscriptionRow | null> {
  const { rows } = await pool.query(
    "SELECT * FROM copilote_fn_subscription_by_stripe_subscription_id($1)",
    [stripeSubscriptionId],
  );
  const r = rows[0] as SubscriptionRpcRow | undefined;
  return r ? subscriptionFromRpcRow(r) : null;
}

/** Garante uma linha em `subscriptions` por usuário (plano free por padrão). */
export async function ensureSubscriptionRow(
  userId: string,
): Promise<SubscriptionRow> {
  const existing = await getSubscriptionByUserId(userId);
  if (existing) return existing;
  await getRequestDb().insert(subscriptions).values({ userId, plan: "free" });
  const created = await getSubscriptionByUserId(userId);
  if (!created) {
    throw new Error("Falha ao criar registro de assinatura");
  }
  return created;
}

export async function upsertPremiumFromCheckout(params: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  await getRequestDb()
    .insert(subscriptions)
    .values({
      userId: params.userId,
      plan: "premium",
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      currentPeriodEnd: params.currentPeriodEnd,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan: "premium",
        stripeCustomerId: params.stripeCustomerId,
        stripeSubscriptionId: params.stripeSubscriptionId,
        currentPeriodEnd: params.currentPeriodEnd,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd,
      },
    });
}

export async function downgradeToFreeForUser(userId: string): Promise<void> {
  await getRequestDb()
    .update(subscriptions)
    .set({
      plan: "free",
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    })
    .where(eq(subscriptions.userId, userId));
}
