import { PremiumGate } from "@/components/shared/premium-gate";
import { InteligenciaPremiumView } from "@/components/inteligencia/inteligencia-premium-view";
import { getInteligenciaPremiumData } from "@/lib/inteligencia-data";
import { requireSession } from "@/lib/get-session";
import { loadForAppUser } from "@/lib/load-for-app-user";
import { getEffectivePlan } from "@/lib/plan-limits";

export default async function InteligenciaPage() {
  const session = await requireSession();
  const userId = session.user.id;

  const { isPremium, data } = await loadForAppUser(userId, async () => {
    const plan = await getEffectivePlan(userId, session.user.email);
    const data = await getInteligenciaPremiumData(userId);
    return { isPremium: plan === "premium", data };
  });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-border px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-black">
          Inteligência
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turnos, mapa de calor, plataformas e custo por km.
        </p>
      </header>

      <PremiumGate isPremium={isPremium} feature="Inteligência financeira">
        <InteligenciaPremiumView data={data} />
      </PremiumGate>
    </div>
  );
}
