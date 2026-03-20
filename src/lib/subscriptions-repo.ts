import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";

export type SubscriptionRow = typeof subscriptions.$inferSelect;

export async function getSubscriptionByUserId(
  userId: string,
): Promise<SubscriptionRow | null> {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function getSubscriptionByStripeSubscriptionId(
  stripeSubscriptionId: string,
): Promise<SubscriptionRow | null> {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);
  return row ?? null;
}

/** Garante uma linha em `subscriptions` por usuário (plano free por padrão). */
export async function ensureSubscriptionRow(
  userId: string,
): Promise<SubscriptionRow> {
  const existing = await getSubscriptionByUserId(userId);
  if (existing) return existing;
  await db.insert(subscriptions).values({ userId, plan: "free" });
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
  await db
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
  await db
    .update(subscriptions)
    .set({
      plan: "free",
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    })
    .where(eq(subscriptions.userId, userId));
}
