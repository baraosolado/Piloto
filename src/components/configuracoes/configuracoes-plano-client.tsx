"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Bolt,
  CreditCard,
  ExternalLink,
  Loader2,
  Shield,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { PlanComparisonCards } from "@/components/planos/plan-comparison-cards";
import {
  PREMIUM_TRIAL_DAYS,
  formatPremiumBrl,
  PREMIUM_MONTHLY_BRL,
  PREMIUM_YEARLY_BRL,
} from "@/lib/pricing";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type ConfiguracoesPlanoClientProps = {
  /** Plano persistido no banco (assinatura Stripe). */
  planDb: "free" | "premium";
  /**
   * Só `true` se o e-mail/UUID estiver em PILOTO_DEVELOPER_* no servidor.
   * O trial de 7 dias NÃO marca isto — utilizadores normais veem fluxo de assinatura.
   */
  isDeveloperAccount: boolean;
  /** Trial local (desde a criação da conta) ainda ativo. */
  signupTrialActive: boolean;
  /** Dias completos restantes do trial local (null se trial inativo). */
  trialDaysRemaining: number | null;
  trialEndedLocked: boolean;
  nextBillingIso: string | null;
  cardLast4: string | null;
  canOpenBillingPortal: boolean;
  cancelAtPeriodEnd: boolean;
  stripeConfigured: boolean;
  stripeYearlyConfigured: boolean;
};

export function ConfiguracoesPlanoClient({
  planDb,
  isDeveloperAccount,
  signupTrialActive,
  trialDaysRemaining,
  trialEndedLocked,
  nextBillingIso,
  cardLast4,
  canOpenBillingPortal,
  cancelAtPeriodEnd,
  stripeConfigured,
  stripeYearlyConfigured,
}: ConfiguracoesPlanoClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );

  useEffect(() => {
    if (!stripeYearlyConfigured && billingPeriod === "yearly") {
      setBillingPeriod("monthly");
    }
  }, [stripeYearlyConfigured, billingPeriod]);

  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;
    toast.success(
      `Período de ${PREMIUM_TRIAL_DAYS} dias grátis ativo! O Premium já está liberado nesta conta.`,
    );
    router.replace("/configuracoes/plano", { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams.get("bloqueado") !== "1" || !trialEndedLocked) return;
    toast.error(
      "O período gratuito terminou. Assine o Premium (mensal ou anual) para voltar a usar a app.",
    );
    router.replace("/configuracoes/plano", { scroll: false });
  }, [searchParams, router, trialEndedLocked]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: { url?: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.url) {
        throw new Error(
          json.error?.message ?? "Não foi possível abrir o portal.",
        );
      }
      window.location.href = json.data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function startCheckout() {
    if (!stripeConfigured) {
      toast.error("Pagamento ainda não está disponível neste ambiente.");
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ billingPeriod }),
      });
      const json = (await res.json()) as {
        data?: { url?: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.url) {
        throw new Error(
          json.error?.message ?? "Não foi possível iniciar o checkout.",
        );
      }
      window.location.href = json.data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao assinar.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function confirmCancel() {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok || json.error) {
        throw new Error(
          json.error?.message ?? "Não foi possível cancelar.",
        );
      }
      toast.success(
        "Assinatura cancelada ao fim do período atual. Você mantém o Premium até lá.",
      );
      setCancelOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar.");
    } finally {
      setCancelLoading(false);
    }
  }

  const subscribeSection = (
    <>
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-[0.2em] text-[#777777] uppercase">
            Nível atual
          </span>
          <h2 className="text-2xl font-black tracking-tight text-[#1a1c1c]">
            {signupTrialActive
              ? `Trial gratuito (${PREMIUM_TRIAL_DAYS} dias)`
              : `Trial de ${PREMIUM_TRIAL_DAYS} dias`}
          </h2>
          <p className="text-sm text-[#474747]">
            {signupTrialActive && trialDaysRemaining != null
              ? `Faltam ${trialDaysRemaining} dia(s) com tudo liberado na app. Assine o Premium para continuar depois do período (a cobrança no Stripe só começa após os ${PREMIUM_TRIAL_DAYS} dias de teste do plano).`
              : `Com tudo liberado no início. Depois do trial, assine o Premium (mensal ou anual) para manter a conta ativa com todas as funções.`}
          </p>
        </div>
        {signupTrialActive && trialDaysRemaining != null ? (
          <div className="rounded-lg border border-[#006d33]/25 bg-[#006d33]/5 px-4 py-3 text-sm text-[#1a1c1c]">
            <span className="font-semibold text-[#006d33]">
              {trialDaysRemaining} dia(s) restante(s)
            </span>
            {" · "}
            Use os preços abaixo e <strong>Continuar no Stripe</strong> para
            ativar a assinatura quando quiser.
          </div>
        ) : null}
      </section>

      <PlanComparisonCards
        isPremiumEffective={false}
        billingSelection={{
          value: billingPeriod,
          onChange: setBillingPeriod,
          yearlyAvailable: stripeYearlyConfigured,
        }}
      />

      <section className="flex flex-col gap-5 rounded-xl border-2 border-black bg-black p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <CreditCard className="size-8 shrink-0 text-[#5adf82]" aria-hidden />
          <div>
            <h3 className="text-lg font-black tracking-tight">
              Assinar Premium
            </h3>
            <p className="text-sm text-white/75">
              {PREMIUM_TRIAL_DAYS} dias grátis no Stripe · depois cobrança
              recorrente · cancele quando quiser
            </p>
          </div>
        </div>

        <p className="rounded-lg bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white">
          Plano escolhido:{" "}
          <span className="text-[#5adf82]">
            {billingPeriod === "yearly"
              ? `Anual (${formatPremiumBrl(PREMIUM_YEARLY_BRL)}/ano)`
              : `Mensal (${formatPremiumBrl(PREMIUM_MONTHLY_BRL)}/mês)`}
          </span>
        </p>

        <Button
          type="button"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black uppercase tracking-widest text-black hover:bg-white/90 disabled:opacity-60"
          onClick={startCheckout}
          disabled={
            checkoutLoading ||
            !stripeConfigured ||
            (billingPeriod === "yearly" && !stripeYearlyConfigured)
          }
        >
          {checkoutLoading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <>
              <Bolt className="size-5" strokeWidth={2} aria-hidden />
              Continuar no Stripe
            </>
          )}
        </Button>
        {!stripeConfigured ? (
          <p className="text-center text-xs text-white/60">
            Configure{" "}
            <code className="rounded bg-white/10 px-1">STRIPE_SECRET_KEY</code>{" "}
            e{" "}
            <code className="rounded bg-white/10 px-1">
              STRIPE_PREMIUM_PRICE_ID_MONTHLY
            </code>{" "}
            (ou{" "}
            <code className="rounded bg-white/10 px-1">STRIPE_PREMIUM_PRICE_ID</code>{" "}
            legado). Para o plano ativar após o pagamento, configure também{" "}
            <code className="rounded bg-white/10 px-1">STRIPE_WEBHOOK_SECRET</code>{" "}
            e rode o webhook (ex.:{" "}
            <code className="rounded bg-white/10 px-1">stripe listen</code>).
          </p>
        ) : null}
      </section>
    </>
  );

  return (
    <div className="flex w-full flex-col gap-12 pb-8">
      {trialEndedLocked && planDb !== "premium" ? (
        <div
          className="flex gap-3 rounded-xl border border-amber-600/40 bg-amber-50 px-4 py-4 text-amber-950 shadow-sm"
          role="alert"
        >
          <TriangleAlert
            className="mt-0.5 size-6 shrink-0 text-amber-700"
            strokeWidth={2}
            aria-hidden
          />
          <div className="space-y-1 text-sm leading-relaxed">
            <p className="font-bold text-amber-950">
              Acesso pausado após o trial de {PREMIUM_TRIAL_DAYS} dias
            </p>
            <p className="text-amber-950/90">
              Escolha o plano mensal ou anual abaixo e conclua o pagamento no
              Stripe para reativar corridas, gastos, relatórios e o restante da
              plataforma.
            </p>
          </div>
        </div>
      ) : null}

      {planDb === "premium" ? (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-[0.2em] text-[#006d33] uppercase">
              Assinatura
            </span>
            <h2 className="text-2xl font-black tracking-tight text-[#1a1c1c]">
              Premium
            </h2>
          </div>

          <div className="flex flex-col gap-8 rounded-xl border border-[#006d33]/10 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-black">
                Detalhes da assinatura
              </h3>
              <div className="flex items-center gap-1.5 rounded-full bg-[#6aee8f]/30 px-3 py-1">
                <span className="size-2 rounded-full bg-[#006d33]" />
                <span className="text-[10px] font-black tracking-widest text-[#006d33] uppercase">
                  Ativo
                </span>
              </div>
            </div>

            {cancelAtPeriodEnd ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Sua assinatura não será renovada após o fim do período atual.
              </p>
            ) : null}

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[#474747]">
                Próxima cobrança
              </span>
              <p className="text-base font-bold text-black">
                {nextBillingIso
                  ? new Date(nextBillingIso).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-xl bg-[#f3f3f3] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-black text-[10px] font-bold tracking-tighter text-white italic">
                  CARD
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-black">
                    Cartão **** {cardLast4 ?? "••••"}
                  </p>
                  <p className="text-[10px] tracking-wider text-[#474747] uppercase">
                    {canOpenBillingPortal
                      ? "Gerenciado pelo Stripe"
                      : "Sem fatura Stripe nesta conta"}
                  </p>
                </div>
              </div>
              {canOpenBillingPortal ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-black font-bold"
                  onClick={openPortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Atualizar pagamento"
                  )}
                </Button>
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              {canOpenBillingPortal ? (
                <>
                  <Button
                    type="button"
                    className="flex h-auto w-full items-center justify-center gap-2 rounded-xl bg-black py-4 text-sm font-bold tracking-tight text-white hover:bg-black/90"
                    onClick={openPortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="size-5" />
                        Gerenciar assinatura no Stripe
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    className="w-full rounded-xl py-3 text-sm font-bold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/40 disabled:opacity-50"
                    onClick={() => setCancelOpen(true)}
                    disabled={cancelAtPeriodEnd}
                  >
                    {cancelAtPeriodEnd
                      ? "Cancelamento já agendado"
                      : "Cancelar renovação"}
                  </button>
                </>
              ) : (
                <p className="rounded-lg bg-[#f3f3f3] px-4 py-3 text-center text-sm text-[#474747]">
                  Portal de cobrança indisponível. Se precisar de ajuda, fale com
                  o suporte.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4 rounded-xl bg-[#f3f3f3] p-6">
            <BadgeCheck
              className="size-6 shrink-0 text-[#006d33]"
              strokeWidth={2}
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-[#474747]">
              Registros e gastos ilimitados, inteligência por turno, relatório
              PDF, exportação CSV e alertas de manutenção avançados.
            </p>
          </div>

          <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                <AlertDialogDescription>
                  O acesso Premium permanece até o fim do período pago. Não
                  haverá nova cobrança após essa data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={confirmCancel}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Confirmar cancelamento"
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      ) : isDeveloperAccount ? (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-[0.2em] text-[#006d33] uppercase">
              Desenvolvimento
            </span>
            <h2 className="text-2xl font-black tracking-tight text-[#1a1c1c]">
              Premium (testes)
            </h2>
            <p className="rounded-lg border border-[#006d33]/30 bg-[#006d33]/5 px-3 py-2 text-sm text-[#1a1c1c]">
              Esta conta está em{" "}
              <code className="rounded bg-white/80 px-1 text-xs">
                PILOTO_DEVELOPER_EMAILS
              </code>{" "}
              ou{" "}
              <code className="rounded bg-white/80 px-1 text-xs">
                PILOTO_DEVELOPER_USER_IDS
              </code>
              : acesso total sem Stripe. Utilizadores normais (fora desta lista)
              veem o trial de {PREMIUM_TRIAL_DAYS} dias e o fluxo de assinatura
              abaixo.
            </p>
          </div>

          <div className="rounded-xl border border-[#006d33]/20 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-black">
                Acesso Premium (testes)
              </h3>
              <div className="flex items-center gap-1.5 rounded-full bg-[#6aee8f]/30 px-3 py-1">
                <span className="size-2 rounded-full bg-[#006d33]" />
                <span className="text-[10px] font-black tracking-widest text-[#006d33] uppercase">
                  Ativo
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#474747]">
              Sem cartão e sem faturas. Para testar checkout e webhook como um
              motorista real, crie outra conta com um e-mail que não esteja na
              lista de desenvolvedor.
            </p>
          </div>
        </section>
      ) : (
        subscribeSection
      )}

      <footer className="flex flex-col items-center border-t border-[#e8e8e8] pt-10 text-center">
        {isDeveloperAccount && planDb !== "premium" ? (
          <>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              Modo desenvolvedor: a experiência de assinatura (Stripe) aparece
              para contas que não estão em PILOTO_DEVELOPER_*.
            </p>
            <Button variant="link" asChild className="mt-4 h-auto p-0 text-xs">
              <Link href="/configuracoes">Voltar às configurações</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-[#474747]">
              <Shield className="size-5 shrink-0" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-widest">
                Pagamento seguro com Stripe
              </span>
            </div>
            <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
              Cartão e faturas ficam no ambiente Stripe. Você pode atualizar
              forma de pagamento, ver histórico e cancelar a renovação pelo
              portal de cobrança.
            </p>
            <Button variant="link" asChild className="mt-4 h-auto p-0 text-xs">
              <Link href="/configuracoes">Voltar às configurações</Link>
            </Button>
          </>
        )}
      </footer>
    </div>
  );
}
