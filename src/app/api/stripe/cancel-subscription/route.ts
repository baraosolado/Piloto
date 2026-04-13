import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { subscriptions } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  try {
    return await runWithAppUserId(auth.userId, async () => {
    const stripe = getStripe();
    const [row] = await getRequestDb()
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

    await getRequestDb()
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true })
      .where(eq(subscriptions.userId, auth.userId));

    return NextResponse.json({ data: { ok: true }, error: null });
    });
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
