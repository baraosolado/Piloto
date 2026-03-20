"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck,
  Bolt,
  ExternalLink,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
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

type Props = {
  mode: "free" | "premium";
  ridesThisMonth: number;
  ridesLimit: number;
  /** Premium: ISO ou null */
  nextBillingIso: string | null;
  cardLast4: string | null;
  canUseStripe: boolean;
  cancelAtPeriodEnd: boolean;
};

export function ConfiguracoesPlanoClient({
  mode,
  ridesThisMonth,
  ridesLimit,
  nextBillingIso,
  cardLast4,
  canUseStripe,
  cancelAtPeriodEnd,
}: Props) {
  const router = useRouter();
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const pct = Math.min(100, Math.round((ridesThisMonth / ridesLimit) * 100));

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

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex w-full max-w-[520px] flex-col gap-10 pb-4 pt-0">
        {mode === "free" ? (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-[0.2em] text-[#777777] uppercase">
                Nível atual
              </span>
              <h2 className="text-2xl font-black tracking-tight text-[#1a1c1c]">
                Plano gratuito
              </h2>
            </div>

            <div className="flex flex-col gap-6 rounded-xl border border-[#e8e8e8]/80 bg-white p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-black">
                    Plano atual: Gratuito
                  </h3>
                  <p className="mt-1 text-sm text-[#474747]">
                    Ideal para motoristas ocasionais.
                  </p>
                </div>
                <Info
                  className="size-6 shrink-0 text-[#3b3b3b]"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="text-sm font-medium text-[#1a1c1c]">
                    {ridesThisMonth} de {ridesLimit} corridas usadas
                  </span>
                  <span className="text-xs font-bold text-black">{pct}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-[#eeeeee]">
                  <div
                    className="h-full rounded-full bg-black transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <Button
                asChild
                className="h-auto w-full rounded-xl bg-black py-4 text-sm font-bold tracking-tight text-white shadow-none hover:bg-black/90 active:scale-[0.98]"
              >
                <Link
                  href="/planos"
                  className="flex items-center justify-center gap-2"
                >
                  <Bolt className="size-5" strokeWidth={2} />
                  Fazer upgrade para Premium — R$ 19,90/mês
                </Link>
              </Button>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-[0.2em] text-[#006d33] uppercase">
                Assinatura ativa
              </span>
              <h2 className="text-2xl font-black tracking-tight text-[#1a1c1c]">
                Premium
              </h2>
            </div>

            <div className="flex flex-col gap-8 rounded-xl border border-[#006d33]/10 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-black">Plano Premium</h3>
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
                    ? `Próxima cobrança: ${new Date(nextBillingIso).toLocaleDateString("pt-BR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}`
                    : "Próxima cobrança: —"}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f3f3f3] p-6">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-black text-[10px] font-bold tracking-tighter text-white italic">
                    CARD
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-black">
                      Cartão **** {cardLast4 ?? "••••"}
                    </p>
                    <p className="text-[10px] tracking-wider text-[#474747] uppercase">
                      {canUseStripe ? "Cartão no Stripe" : "Sem cartão no Stripe"}
                    </p>
                  </div>
                </div>
                {canUseStripe ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-bold text-black underline decoration-2 underline-offset-4 transition-colors hover:text-[#006d33]"
                    onClick={openPortal}
                    disabled={portalLoading}
                  >
                    Atualizar pagamento
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                {canUseStripe ? (
                  <>
                    <Button
                      type="button"
                      className="h-auto w-full rounded-xl bg-black py-4 text-sm font-bold tracking-tight text-white hover:bg-black/90 active:scale-[0.98]"
                      onClick={openPortal}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <>
                          <ExternalLink className="mr-2 size-5" />
                          Gerenciar assinatura
                        </>
                      )}
                    </Button>
                    <button
                      type="button"
                      className="w-full rounded-xl py-4 text-sm font-bold tracking-tight text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/40 active:scale-[0.98] disabled:opacity-50"
                      onClick={() => setCancelOpen(true)}
                      disabled={cancelAtPeriodEnd}
                    >
                      Cancelar plano
                    </button>
                  </>
                ) : (
                  <p className="rounded-lg bg-[#f3f3f3] px-4 py-3 text-center text-sm text-[#474747]">
                    Portal de cobrança indisponível nesta conta (desenvolvimento
                    ou sem Stripe). Os benefícios Premium do app continuam
                    ativos.
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
                Como assinante Premium, você tem corridas e gastos ilimitados,
                inteligência por turno, relatórios PDF e exportação CSV.
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
        )}
      </div>
    </div>
  );
}
