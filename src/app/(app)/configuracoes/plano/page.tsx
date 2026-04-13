import { Suspense } from "react";
import { ConfiguracoesPlanoClient } from "@/components/configuracoes/configuracoes-plano-client";
import { ConfiguracoesSubpageHeader } from "@/components/configuracoes/configuracoes-subpage-header";
import { requireSession } from "@/lib/get-session";
import {
  getUserCreatedAt,
  getUserPlan,
  hasSignupTrialActive,
  isAccountLockedWithoutSubscription,
  isDeveloperAccount,
  signupTrialEndsAt,
} from "@/lib/plan-limits";
import { loadForAppUser } from "@/lib/load-for-app-user";
import { getCustomerCardLast4 } from "@/lib/stripe";
import { getSubscriptionByUserId } from "@/lib/subscriptions-repo";

export default async function ConfiguracoesPlanoPage() {
  const session = await requireSession();
  const userId = session.user.id;
  const email = session.user.email;

  const { planDb, subRow, trialEndedLocked, signupTrialActive, createdAt } =
    await loadForAppUser(userId, async () => {
      const [
        planDb,
        subRow,
        trialEndedLocked,
        createdAt,
        signupTrialActive,
      ] = await Promise.all([
        getUserPlan(userId),
        getSubscriptionByUserId(userId),
        isAccountLockedWithoutSubscription(userId, email),
        getUserCreatedAt(userId),
        hasSignupTrialActive(userId),
      ]);
      return {
        planDb,
        subRow,
        trialEndedLocked,
        createdAt,
        signupTrialActive,
      };
    });

  const isPremiumDb = planDb === "premium";
  const devAccount = isDeveloperAccount(userId, email);
  const trialDaysRemaining =
    signupTrialActive && createdAt
      ? Math.max(
          0,
          Math.ceil(
            (signupTrialEndsAt(createdAt).getTime() - Date.now()) /
              (24 * 60 * 60 * 1000),
          ),
        )
      : null;
  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      (process.env.STRIPE_PREMIUM_PRICE_ID_MONTHLY?.trim() ||
        process.env.STRIPE_PREMIUM_PRICE_ID?.trim()),
  );
  const stripeYearlyConfigured = Boolean(
    process.env.STRIPE_PREMIUM_PRICE_ID_YEARLY?.trim(),
  );

  const hasStripeCustomer =
    Boolean(subRow?.stripeCustomerId) &&
    Boolean(process.env.STRIPE_SECRET_KEY?.trim());

  let cardLast4: string | null = null;
  if (hasStripeCustomer && subRow?.stripeCustomerId) {
    try {
      cardLast4 = await getCustomerCardLast4(subRow.stripeCustomerId);
    } catch {
      cardLast4 = null;
    }
  }

  const nextBillingIso = subRow?.currentPeriodEnd
    ? subRow.currentPeriodEnd.toISOString()
    : null;

  const canOpenBillingPortal =
    isPremiumDb === true && Boolean(subRow?.stripeCustomerId);

  return (
    <div>
      <ConfiguracoesSubpageHeader title="Plano e pagamento" />
      <Suspense fallback={null}>
        <ConfiguracoesPlanoClient
          planDb={planDb}
          isDeveloperAccount={devAccount}
          signupTrialActive={signupTrialActive}
          trialDaysRemaining={trialDaysRemaining}
          trialEndedLocked={trialEndedLocked}
          nextBillingIso={nextBillingIso}
          cardLast4={cardLast4}
          canOpenBillingPortal={canOpenBillingPortal}
          cancelAtPeriodEnd={subRow?.cancelAtPeriodEnd ?? false}
          stripeConfigured={stripeConfigured}
          stripeYearlyConfigured={stripeYearlyConfigured}
        />
      </Suspense>
    </div>
  );
}
