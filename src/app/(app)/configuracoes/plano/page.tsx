import { ConfiguracoesPlanoClient } from "@/components/configuracoes/configuracoes-plano-client";
import { ConfiguracoesSubpageHeader } from "@/components/configuracoes/configuracoes-subpage-header";
import { requireSession } from "@/lib/get-session";
import {
  countRidesThisMonth,
  FREE_RIDES_PER_MONTH,
  getEffectivePlan,
  getUserPlan,
} from "@/lib/plan-limits";
import { getCustomerCardLast4 } from "@/lib/stripe";
import { getSubscriptionByUserId } from "@/lib/subscriptions-repo";

export default async function ConfiguracoesPlanoPage() {
  const session = await requireSession();
  const userId = session.user.id;
  const email = session.user.email;

  const [effective, planDb, subRow, ridesCount] = await Promise.all([
    getEffectivePlan(userId, email),
    getUserPlan(userId),
    getSubscriptionByUserId(userId),
    countRidesThisMonth(userId),
  ]);

  const isPremiumEffective = effective === "premium";
  const isPremiumDb = planDb === "premium";
  const hasStripe =
    Boolean(subRow?.stripeCustomerId) &&
    Boolean(process.env.STRIPE_SECRET_KEY?.trim());

  let cardLast4: string | null = null;
  if (hasStripe && subRow?.stripeCustomerId) {
    try {
      cardLast4 = await getCustomerCardLast4(subRow.stripeCustomerId);
    } catch {
      cardLast4 = null;
    }
  }

  const nextBillingIso = subRow?.currentPeriodEnd
    ? subRow.currentPeriodEnd.toISOString()
    : null;

  return (
    <div>
      <ConfiguracoesSubpageHeader title="Plano e pagamento" />
      {isPremiumEffective ? (
        <ConfiguracoesPlanoClient
          mode="premium"
          ridesThisMonth={ridesCount}
          ridesLimit={FREE_RIDES_PER_MONTH}
          nextBillingIso={nextBillingIso}
          cardLast4={cardLast4}
          canUseStripe={isPremiumDb && Boolean(subRow?.stripeCustomerId)}
          cancelAtPeriodEnd={subRow?.cancelAtPeriodEnd ?? false}
        />
      ) : (
        <ConfiguracoesPlanoClient
          mode="free"
          ridesThisMonth={ridesCount}
          ridesLimit={FREE_RIDES_PER_MONTH}
          nextBillingIso={null}
          cardLast4={null}
          canUseStripe={false}
          cancelAtPeriodEnd={false}
        />
      )}
    </div>
  );
}
