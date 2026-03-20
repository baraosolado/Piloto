import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { ConfiguracoesSubpageHeader } from "@/components/configuracoes/configuracoes-subpage-header";
import { VeiculoSettingsForm } from "@/components/configuracoes/veiculo-settings-form";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/get-session";

export default async function ConfiguracoesVeiculoPage() {
  const session = await requireSession();
  const [v] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, session.user.id))
    .limit(1);

  if (!v) {
    return (
      <div className="max-w-lg space-y-4">
        <ConfiguracoesSubpageHeader title="Veículo" />
        <p className="text-sm text-muted-foreground">
          Você ainda não cadastrou um veículo. Complete o onboarding para
          habilitar esta página.
        </p>
        <Button asChild>
          <Link href="/onboarding/veiculo">Cadastrar veículo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <ConfiguracoesSubpageHeader title="Veículo" />
      <VeiculoSettingsForm
        defaultValues={{
          model: v.model,
          year: v.year,
          fuelConsumption: Number(v.fuelConsumption),
          fuelPrice: Number(v.fuelPrice),
          currentOdometer: v.currentOdometer ?? 0,
          depreciationPerKm: Number(v.depreciationPerKm),
        }}
      />
    </div>
  );
}
