"use client";

import Link from "next/link";
import { Check, Gauge, Mail, Sparkles } from "lucide-react";
import { MaintenancePushPanel } from "@/components/push/maintenance-push-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function NotificacoesSettingsClient() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-8">
      <p className="text-sm leading-relaxed text-[#474747]">
        Escolha como quer ser avisado. As notificações de manutenção usam o
        navegador neste dispositivo; e-mails de segurança seguem as regras da
        conta.
      </p>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 shadow-sm">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100/80">
            <Gauge className="size-5 text-amber-900" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-amber-950">Odômetro do veículo</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-950/90">
              Para os <strong>avisos de manutenção no navegador</strong> fazerem
              sentido, você precisa informar o <strong>odômetro atual</strong> do
              carro. Sem isso, o app não sabe em que km você está e não consegue
              calcular quando avisar.
            </p>
            <Button
              asChild
              className="mt-4 h-10 bg-black font-bold text-white hover:bg-black/90"
            >
              <Link href="/configuracoes/veiculo">Cadastrar ou atualizar odômetro</Link>
            </Button>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest text-[#474747] uppercase">
          Navegador
        </h2>
        <MaintenancePushPanel />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest text-[#474747] uppercase">
          E-mail
        </h2>
        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-200/40">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eeeeee]">
              <Mail className="size-5 text-black" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <p className="font-bold text-[#1a1c1c]">Mensagens automáticas</p>
              <p className="mt-1 text-sm text-[#474747]">
                Enviamos e-mail quando for necessário para proteger sua conta.
                Não é possível desativar estes avisos.
              </p>
            </div>
          </div>
          <ul className="space-y-2 border-t border-zinc-100 pt-4">
            <li className="flex items-center gap-2 text-sm text-[#1a1c1c]">
              <Check
                className="size-4 shrink-0 text-[#006d33]"
                strokeWidth={2.5}
                aria-hidden
              />
              Recuperação de senha e redefinição segura
            </li>
            <li className="flex items-center gap-2 text-sm text-[#1a1c1c]">
              <Check
                className="size-4 shrink-0 text-[#006d33]"
                strokeWidth={2.5}
                aria-hidden
              />
              Confirmação de novo e-mail (quando você alterar na conta)
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest text-[#474747] uppercase">
          Dicas e novidades
        </h2>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
              <Sparkles className="size-5 text-[#006d33]" strokeWidth={2} aria-hidden />
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold uppercase">
              Em breve
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#474747]">
            Quer receber lembretes de meta, resumo semanal ou novidades do
            Copilote por e-mail? Estamos preparando preferências granulares —
            por enquanto, use os alertas de manutenção no navegador acima.
          </p>
        </div>
      </section>
    </div>
  );
}
