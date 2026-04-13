import { eq } from "drizzle-orm";
import { getRequestDb } from "@/db/request-db";
import { users } from "@/db/schema";
import { ConfiguracoesHubView } from "@/components/configuracoes/configuracoes-hub-view";
import { requireSession } from "@/lib/get-session";
import { loadForAppUser } from "@/lib/load-for-app-user";
import { getEffectivePlan } from "@/lib/plan-limits";
import pkg from "../../../../package.json";

export default async function ConfiguracoesIndexPage() {
  const session = await requireSession();
  const { displayName, subtitle, canAccessMestre } = await loadForAppUser(
    session.user.id,
    async () => {
      const [row] = await getRequestDb()
        .select({ name: users.name, role: users.role })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      const plan = await getEffectivePlan(session.user.id, session.user.email);
      const subtitle =
        plan === "premium"
          ? "Motorista Premium • Copilote"
          : "Plano gratuito • Copilote";

      return {
        displayName: row?.name?.trim() || "Motorista",
        subtitle,
        canAccessMestre: row?.role === "super_admin",
      };
    },
  );

  return (
    <ConfiguracoesHubView
      displayName={displayName}
      subtitle={subtitle}
      appVersion={pkg.version}
      canAccessMestre={canAccessMestre}
    />
  );
}
