import Link from "next/link";
import { Check, Shield, X } from "lucide-react";
import { PlanosSubscribeActions } from "@/components/planos/planos-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/get-session";
import { getEffectivePlan } from "@/lib/plan-limits";
import { getSubscriptionByUserId } from "@/lib/subscriptions-repo";
import { cn } from "@/lib/utils";

function FeatureYes({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Check
        className="size-5 shrink-0 text-[#006d33]"
        strokeWidth={2.5}
        aria-hidden
      />
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

function FeatureNo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 opacity-40">
      <X className="size-5 shrink-0 text-[#777777]" strokeWidth={2} aria-hidden />
      <span className="text-sm">{children}</span>
    </div>
  );
}

export default async function PlanosPage() {
  const session = await requireSession();
  const userId = session.user.id;
  const email = session.user.email;

  const [effectivePlan, subRow] = await Promise.all([
    getEffectivePlan(userId, email),
    getSubscriptionByUserId(userId),
  ]);

  const isPremiumEffective = effectivePlan === "premium";
  const isPremiumDb = subRow?.plan === "premium";
  const canOpenBillingPortal =
    isPremiumDb === true && Boolean(subRow?.stripeCustomerId);

  return (
    <div className="flex min-h-0 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:mx-auto md:max-w-2xl md:px-6">
          <ButtonIconClose />
          <h1 className="flex-1 text-center text-sm font-bold tracking-tight text-black uppercase">
            Planos
          </h1>
          <div className="w-9 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="flex-1 px-4 py-8 pb-28 md:mx-auto md:max-w-4xl md:px-6">
        <section className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-black tracking-tighter text-black md:text-[32px] md:leading-tight">
            Desbloqueie todo o potencial do Piloto
          </h2>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Escolha o plano ideal para sua rentabilidade
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          {/* Gratuito */}
          <article
            className={cn(
              "relative overflow-hidden rounded-xl border-2 bg-white",
              "border-[#c6c6c6]/30",
            )}
          >
            <div className="p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  {!isPremiumEffective ? (
                    <Badge
                      variant="secondary"
                      className="mb-2 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                    >
                      Seu plano atual
                    </Badge>
                  ) : null}
                  <h3 className="text-2xl font-bold">Plano Gratuito</h3>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">R$ 0</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <FeatureYes>Dashboard básico</FeatureYes>
                <FeatureYes>Até 50 corridas/mês</FeatureYes>
                <FeatureYes>Até 20 gastos/mês</FeatureYes>
                <FeatureNo>Corridas e gastos ilimitados</FeatureNo>
                <FeatureNo>Score de eficiência por turno</FeatureNo>
                <FeatureNo>Heatmap de dias e horários</FeatureNo>
                <FeatureNo>Comparativo entre plataformas</FeatureNo>
                <FeatureNo>Relatório mensal em PDF</FeatureNo>
                <FeatureNo>Exportação em CSV</FeatureNo>
                <FeatureNo>Alertas avançados de manutenção</FeatureNo>
              </div>
            </div>
          </article>

          {/* Premium */}
          <article
            className={cn(
              "relative flex flex-col overflow-hidden rounded-xl border-2 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
              isPremiumEffective
                ? "border-[#c6c6c6]/30"
                : "border-black",
            )}
          >
            <div className="bg-black py-1.5 text-center text-[10px] font-black tracking-[0.2em] text-white uppercase">
              Recomendado
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black">Plano Premium</h3>
                    {isPremiumEffective ? (
                      <Badge className="rounded border-0 bg-[#006d33] text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#006d33]/90">
                        Plano atual
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs font-bold tracking-wider text-[#006d33] uppercase">
                    Cancele quando quiser
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">R$ 19,90</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Check
                    className="size-5 shrink-0 text-[#006d33]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span className="text-sm font-bold">Tudo do gratuito</span>
                </div>
                <FeatureYes>Corridas e gastos ilimitados</FeatureYes>
                <FeatureYes>Score de eficiência por turno</FeatureYes>
                <FeatureYes>Heatmap de dias e horários</FeatureYes>
                <FeatureYes>Comparativo entre plataformas</FeatureYes>
                <FeatureYes>Relatório mensal em PDF</FeatureYes>
                <FeatureYes>Exportação em CSV</FeatureYes>
                <FeatureYes>Alertas avançados de manutenção</FeatureYes>
              </div>

              <div className="mt-auto">
                <PlanosSubscribeActions
                  isPremiumEffective={isPremiumEffective}
                  canOpenBillingPortal={canOpenBillingPortal}
                />
              </div>
            </div>
          </article>
        </div>

        <footer className="mt-12 flex flex-col items-center px-4 pb-8 text-center">
          <div className="mb-3 flex items-center gap-2 opacity-50 grayscale">
            <Shield className="size-5" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-widest">
              Pagamento seguro
            </span>
          </div>
          <p className="max-w-xs text-[11px] leading-relaxed text-muted-foreground">
            Pagamento processado via{" "}
            <strong className="text-foreground">Stripe</strong>. Cancele a
            qualquer momento nas configurações, sem burocracia.
          </p>
          <Button variant="link" asChild className="mt-4 h-auto p-0 text-xs">
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </footer>
      </main>
    </div>
  );
}

function ButtonIconClose() {
  return (
    <Link
      href="/dashboard"
      className="flex size-9 shrink-0 items-center justify-center rounded-md text-black transition-opacity hover:opacity-70 active:scale-95"
      aria-label="Fechar e voltar ao dashboard"
    >
      <X className="size-5" aria-hidden />
    </Link>
  );
}
