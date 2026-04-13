import { Check, Circle, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PREMIUM_TRIAL_DAYS,
  formatPremiumBrl,
  premiumMonthlyFullYearBrl,
  premiumYearlySavingsVsMonthlyBrl,
  PREMIUM_MONTHLY_BRL,
  PREMIUM_YEARLY_BRL,
} from "@/lib/pricing";
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

export type PlanBillingPeriod = "monthly" | "yearly";

export type PlanComparisonBillingSelection = {
  value: PlanBillingPeriod;
  onChange: (period: PlanBillingPeriod) => void;
  yearlyAvailable: boolean;
};

type Props = {
  isPremiumEffective: boolean;
  /** Se definido e o usuário não é premium, mensal/anual viram opções clicáveis (radiogroup). */
  billingSelection?: PlanComparisonBillingSelection | null;
};

/**
 * Apresentação do plano Premium (trial + mensal / anual com desconto) e benefícios.
 */
export function PlanComparisonCards({
  isPremiumEffective,
  billingSelection,
}: Props) {
  const fullYear = premiumMonthlyFullYearBrl();
  const savings = premiumYearlySavingsVsMonthlyBrl();

  const interactive = Boolean(billingSelection) && !isPremiumEffective;
  const value = billingSelection?.value ?? "monthly";
  const yearlyOk = billingSelection?.yearlyAvailable ?? false;

  return (
    <section className="w-full" aria-labelledby="planos-premium-heading">
      <h2
        id="planos-premium-heading"
        className="mb-4 text-lg font-black tracking-tight text-[#1a1c1c]"
      >
        Plano Premium
      </h2>

      <article
        className={cn(
          "overflow-hidden rounded-xl border-2 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
          isPremiumEffective
            ? "border-[#006d33]/40 shadow-[0_0_0_1px_rgba(0,109,51,0.12)]"
            : "border-black",
        )}
      >
        <div className="bg-black py-2 text-center text-[10px] font-black tracking-[0.2em] text-white uppercase">
          {PREMIUM_TRIAL_DAYS} dias grátis para testar · cancele quando quiser
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-black tracking-tight">Premium</h3>
                {isPremiumEffective ? (
                  <Badge className="rounded border-0 bg-[#006d33] text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#006d33]/90">
                    Ativo
                  </Badge>
                ) : null}
              </div>
              <p className="max-w-md text-sm text-[#474747]">
                {interactive
                  ? "Toque na opção desejada e confirme em Continuar no Stripe abaixo."
                  : "Depois do período de teste, a cobrança segue o plano que você escolheu."}
              </p>
            </div>
          </div>

          <div
            className="mb-8 grid gap-4 sm:grid-cols-2"
            role={interactive ? "radiogroup" : undefined}
            aria-label={
              interactive ? "Periodicidade da cobrança após o trial" : undefined
            }
          >
            {interactive ? (
              <>
                <button
                  type="button"
                  role="radio"
                  aria-checked={value === "monthly"}
                  onClick={() => billingSelection!.onChange("monthly")}
                  className={cn(
                    "rounded-xl border-2 p-5 text-left outline-none transition-all",
                    "focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                    value === "monthly"
                      ? "border-black bg-[#f0fff4] shadow-md ring-2 ring-black/10"
                      : "border-[#e8e8e8] bg-[#fafafa] hover:border-black/40",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black tracking-widest text-[#006d33] uppercase">
                      Mensal
                    </p>
                    {value === "monthly" ? (
                      <CircleDot
                        className="size-5 shrink-0 text-[#006d33]"
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        className="size-5 shrink-0 text-[#c6c6c6]"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                    )}
                  </div>
                  <p className="text-2xl font-black text-black">
                    {formatPremiumBrl(PREMIUM_MONTHLY_BRL)}
                    <span className="text-sm font-bold text-muted-foreground">
                      /mês
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-[#474747]">
                    Cobrança automática todo mês após os {PREMIUM_TRIAL_DAYS} dias
                    grátis.
                  </p>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={value === "yearly"}
                  aria-disabled={!yearlyOk}
                  disabled={!yearlyOk}
                  onClick={() => yearlyOk && billingSelection!.onChange("yearly")}
                  className={cn(
                    "rounded-xl border-2 p-5 text-left outline-none transition-all",
                    "focus-visible:ring-2 focus-visible:ring-[#006d33] focus-visible:ring-offset-2",
                    !yearlyOk && "cursor-not-allowed opacity-55",
                    value === "yearly" && yearlyOk
                      ? "border-[#006d33] bg-[#006d33]/10 shadow-md ring-2 ring-[#006d33]/20"
                      : yearlyOk
                        ? "border-[#006d33]/40 bg-[#006d33]/[0.06] hover:border-[#006d33]"
                        : "border-[#e8e8e8] bg-[#fafafa]",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black tracking-widest text-[#006d33] uppercase">
                      Anual com desconto
                    </p>
                    {value === "yearly" && yearlyOk ? (
                      <CircleDot
                        className="size-5 shrink-0 text-[#006d33]"
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        className="size-5 shrink-0 text-[#c6c6c6]"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                    )}
                  </div>
                  <p className="text-2xl font-black text-black">
                    {formatPremiumBrl(PREMIUM_YEARLY_BRL)}
                    <span className="text-sm font-bold text-muted-foreground">
                      /ano
                    </span>
                  </p>
                  <p className="mt-2 text-xs font-medium text-[#1a1c1c]">
                    {yearlyOk ? (
                      <>
                        Em vez de {formatPremiumBrl(fullYear)} (12× mensal). Você
                        economiza{" "}
                        <span className="font-bold text-[#006d33]">
                          {formatPremiumBrl(savings)}
                        </span>
                        .
                      </>
                    ) : (
                      "Configure STRIPE_PREMIUM_PRICE_ID_YEARLY no servidor para habilitar."
                    )}
                  </p>
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl border-2 border-[#e8e8e8] bg-[#fafafa] p-5">
                  <p className="text-[10px] font-black tracking-widest text-[#474747] uppercase">
                    Mensal
                  </p>
                  <p className="mt-2 text-2xl font-black text-black">
                    {formatPremiumBrl(PREMIUM_MONTHLY_BRL)}
                    <span className="text-sm font-bold text-muted-foreground">
                      /mês
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-[#474747]">
                    Cobrança automática todo mês após os {PREMIUM_TRIAL_DAYS} dias
                    grátis.
                  </p>
                </div>
                <div className="rounded-xl border-2 border-[#006d33] bg-[#006d33]/[0.06] p-5">
                  <p className="text-[10px] font-black tracking-widest text-[#006d33] uppercase">
                    Anual com desconto
                  </p>
                  <p className="mt-2 text-2xl font-black text-black">
                    {formatPremiumBrl(PREMIUM_YEARLY_BRL)}
                    <span className="text-sm font-bold text-muted-foreground">
                      /ano
                    </span>
                  </p>
                  <p className="mt-2 text-xs font-medium text-[#1a1c1c]">
                    Em vez de {formatPremiumBrl(fullYear)} (12× mensal). Você
                    economiza{" "}
                    <span className="font-bold text-[#006d33]">
                      {formatPremiumBrl(savings)}
                    </span>
                    .
                  </p>
                </div>
              </>
            )}
          </div>

          <p className="mb-4 text-xs font-bold tracking-widest text-[#474747] uppercase">
            Incluído no Premium
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureYes>Dashboard completo</FeatureYes>
            <FeatureYes>Registros e gastos ilimitados</FeatureYes>
            <FeatureYes>Score de eficiência por turno</FeatureYes>
            <FeatureYes>Heatmap de dias e horários</FeatureYes>
            <FeatureYes>Comparativo entre plataformas</FeatureYes>
            <FeatureYes>Relatório mensal em PDF</FeatureYes>
            <FeatureYes>Exportação em CSV</FeatureYes>
            <FeatureYes>Alertas avançados de manutenção</FeatureYes>
          </div>
        </div>
      </article>
    </section>
  );
}
