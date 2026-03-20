import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ConfiguracoesHubView } from "@/components/configuracoes/configuracoes-hub-view";
import { requireSession } from "@/lib/get-session";
import { getEffectivePlan } from "@/lib/plan-limits";
import pkg from "../../../../package.json";

export default async function ConfiguracoesIndexPage() {
  const session = await requireSession();
  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const plan = await getEffectivePlan(session.user.id, session.user.email);
  const subtitle =
    plan === "premium"
      ? "Motorista Premium • Piloto"
      : "Plano gratuito • Piloto";

  return (
    <ConfiguracoesHubView
      displayName={row?.name?.trim() || "Motorista"}
      subtitle={subtitle}
      appVersion={pkg.version}
    />
  );
}
