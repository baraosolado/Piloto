import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const auth = await getSessionUserId();
  if ("response" in auth) return auth.response;

  try {
    const stripe = getStripe();
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, auth.userId))
      .limit(1);

    if (!row?.stripeSubscriptionId) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION",
            message: "Nenhuma assinatura ativa para cancelar.",
          },
        },
        { status: 400 },
      );
    }

    await stripe.subscriptions.update(row.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true })
      .where(eq(subscriptions.userId, auth.userId));

    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (e) {
    const raw =
      e instanceof Error ? e.message : "Erro ao cancelar assinatura.";
    const message =
      process.env.NODE_ENV === "production"
        ? "Erro ao processar pagamento. Tente novamente."
        : raw;
    return NextResponse.json(
      { data: null, error: { code: "STRIPE", message } },
      { status: 500 },
    );
  }
}
