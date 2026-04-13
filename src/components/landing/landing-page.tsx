"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell,
  FileText,
  Fuel,
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import { CalculatorSection } from "@/components/landing/calculator-section";
import { FadeInView } from "@/components/landing/fade-in-view";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-black text-white">
      {children}
    </div>
  );
}

export function PublicLanding() {
  return (
    <div className="min-h-[max(884px,100dvh)] bg-[#f9f9f9] text-[#1a1c1c] antialiased">
      <LandingHeader />
      <main className="pt-20">
        <motion.section
          className="relative overflow-hidden px-6 pt-16 pb-24"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <h1 className="mb-6 text-5xl leading-[1.1] font-black tracking-tighter md:text-7xl">
                Descubra quanto você realmente ganha por corrida
              </h1>
              <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[#474747] md:text-xl lg:mx-0">
                Controle financeiro feito para motoristas de app. Calcule seu
                lucro real, veja qual turno compensa e pare de trabalhar no
                prejuízo.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  href="/cadastro"
                  className="w-full rounded-lg bg-black px-10 py-5 text-center text-lg font-bold text-white transition-all hover:opacity-90 active:scale-95 sm:w-auto"
                >
                  Criar conta grátis
                </Link>
                <a
                  className="flex items-center gap-2 px-4 py-5 font-bold transition-transform hover:translate-y-1"
                  href="#calculator"
                >
                  Ver como funciona ↓
                </a>
              </div>
            </div>
            <div className="group relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-[#006d33]/20 to-transparent blur-2xl transition-opacity group-hover:opacity-75" />
              <div className="relative rounded-[2rem] border border-white/10 bg-black p-4 shadow-2xl">
                <div className="flex aspect-[4/3] flex-col rounded-[1.5rem] bg-zinc-900 p-6 text-white">
                  <div className="mb-8 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-400">
                      Resumo do dia
                    </span>
                    <span className="rounded-full bg-[#006d33] px-2 py-1 text-[10px] font-bold text-white">
                      EM OPERAÇÃO
                    </span>
                  </div>
                  <div className="mb-10">
                    <span className="mb-1 block text-sm text-zinc-400">
                      Lucro líquido real
                    </span>
                    <span className="text-5xl font-black tracking-tighter">
                      R$ 248,50
                    </span>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-zinc-800 p-4">
                      <span className="mb-1 block text-[10px] text-zinc-500">
                        CUSTO/KM
                      </span>
                      <span className="text-xl font-bold">R$ 0,84</span>
                    </div>
                    <div className="rounded-xl bg-zinc-800 p-4">
                      <span className="mb-1 block text-[10px] text-zinc-500">
                        EFICIÊNCIA
                      </span>
                      <span className="text-xl font-bold text-[#006d33]">
                        A+
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <CalculatorSection />

        <FadeInView className="mx-auto max-w-7xl px-6 py-24">
          <h2 className="mb-16 text-center text-4xl font-black tracking-tighter">
            Você sabe quanto gasta com o seu carro?
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-[2rem] bg-[#f3f3f3] p-10 transition-transform hover:-translate-y-2">
              <Fuel
                className="mb-6 size-10 text-black"
                strokeWidth={1.5}
                aria-hidden
              />
              <h3 className="mb-4 text-2xl font-bold">Combustível invisível</h3>
              <p className="leading-relaxed text-[#474747]">
                A maioria dos motoristas não calcula o custo real por km,
                ignorando o impacto direto no bolso a cada corrida aceita.
              </p>
            </div>
            <div className="rounded-[2rem] bg-[#f3f3f3] p-10 transition-transform hover:-translate-y-2">
              <Wrench
                className="mb-6 size-10 text-black"
                strokeWidth={1.5}
                aria-hidden
              />
              <h3 className="mb-4 text-2xl font-bold">Manutenção surpresa</h3>
              <p className="leading-relaxed text-[#474747]">
                Sem uma provisão para pneus, óleo e freios, qualquer problema
                mecânico se transforma em uma dívida impagável.
              </p>
            </div>
            <div className="rounded-[2rem] bg-[#f3f3f3] p-10 transition-transform hover:-translate-y-2">
              <Wallet
                className="mb-6 size-10 text-black"
                strokeWidth={1.5}
                aria-hidden
              />
              <h3 className="mb-4 text-2xl font-bold">Lucro ilusório</h3>
              <p className="leading-relaxed text-[#474747]">
                Faturar R$ 5.000,00 bruto não significa ter esse dinheiro livre.
                O lucro real costuma ser metade do que aparece no app.
              </p>
            </div>
          </div>
        </FadeInView>

        <FadeInView
          className="bg-white px-6 py-24"
          id="recursos"
          aria-labelledby="recursos-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
              <div>
                <h2
                  id="recursos-heading"
                  className="sticky top-32 mb-8 text-4xl font-black tracking-tighter md:text-5xl"
                >
                  Tudo que você precisa em um lugar só
                </h2>
                <div className="h-1 w-20 rounded-full bg-[#006d33]" />
              </div>
              <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
                <div>
                  <FeatureIcon>
                    <LayoutDashboard className="size-5" strokeWidth={2} aria-hidden />
                  </FeatureIcon>
                  <h4 className="mb-2 text-xl font-bold">Painel de lucro</h4>
                  <p className="text-sm text-[#474747]">
                    Visualize seus ganhos líquidos em tempo real com gráficos
                    intuitivos.
                  </p>
                </div>
                <div>
                  <FeatureIcon>
                    <TrendingUp className="size-5" strokeWidth={2} aria-hidden />
                  </FeatureIcon>
                  <h4 className="mb-2 text-xl font-bold">Score de eficiência</h4>
                  <p className="text-sm text-[#474747]">
                    Saiba exatamente quais turnos e zonas geram o melhor retorno
                    financeiro.
                  </p>
                </div>
                <div>
                  <FeatureIcon>
                    <Bell className="size-5" strokeWidth={2} aria-hidden />
                  </FeatureIcon>
                  <h4 className="mb-2 text-xl font-bold">
                    Alertas de manutenção
                  </h4>
                  <p className="text-sm text-[#474747]">
                    Seja notificado quando for hora de trocar óleo, pneus ou
                    revisar o motor.
                  </p>
                </div>
                <div>
                  <FeatureIcon>
                    <FileText className="size-5" strokeWidth={2} aria-hidden />
                  </FeatureIcon>
                  <h4 className="mb-2 text-xl font-bold">Relatório mensal PDF</h4>
                  <p className="text-sm text-[#474747]">
                    Exportação completa de dados para seu controle pessoal ou
                    contador.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeInView>

        <FadeInView
          className="bg-black px-6 py-24 text-white"
          id="depoimentos"
          aria-labelledby="depoimentos-heading"
        >
          <div className="mx-auto max-w-7xl text-center">
            <div className="mb-8 inline-block rounded-full bg-[#006d33] px-4 py-1 text-xs font-bold">
              COMUNIDADE
            </div>
            <h2
              id="depoimentos-heading"
              className="mb-16 text-4xl font-black tracking-tighter"
            >
              2.000+ motoristas controlando seus ganhos
            </h2>
            <div className="grid grid-cols-1 gap-8 text-left md:grid-cols-3">
              <div className="rounded-2xl border border-white/25 bg-zinc-900 p-8">
                <p className="mb-6 text-lg text-zinc-300 italic">
                  &ldquo;O Copilote me mostrou que eu estava pagando para trabalhar
                  em certos horários. Mudei minha rotina e meu lucro subiu
                  30%.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-zinc-800 font-bold">
                    R
                  </div>
                  <div>
                    <p className="font-bold">Ricardo S.</p>
                    <p className="text-xs text-zinc-500">São Paulo, SP</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/25 bg-zinc-900 p-8">
                <p className="mb-6 text-lg text-zinc-300 italic">
                  &ldquo;Finalmente entendi meus custos. O alerta de manutenção
                  já me salvou de um prejuízo enorme no motor.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-zinc-800 font-bold">
                    M
                  </div>
                  <div>
                    <p className="font-bold">Marcos J.</p>
                    <p className="text-xs text-zinc-500">Curitiba, PR</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/25 bg-zinc-900 p-8">
                <p className="mb-6 text-lg text-zinc-300 italic">
                  &ldquo;Simples, direto e funcional. O relatório PDF é perfeito
                  para eu saber quanto guardar para o IPVA no final do
                  ano.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-zinc-800 font-bold">
                    A
                  </div>
                  <div>
                    <p className="font-bold">Ana Paula</p>
                    <p className="text-xs text-zinc-500">Rio de Janeiro, RJ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeInView>

        <FadeInView className="px-6 py-32">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[3rem] bg-[#e8e8e8] p-12 text-center">
            <div className="absolute top-0 right-0 -mt-32 -mr-32 size-64 bg-[#006d33]/10 blur-3xl" />
            <div className="relative z-10">
              <h2 className="mb-4 text-4xl font-black tracking-tighter md:text-5xl">
                Comece grátis hoje
              </h2>
              <p className="mb-10 text-lg text-[#474747]">
                Sem cartão de crédito. Configure em 3 minutos.
              </p>
              <Link
                href="/cadastro"
                className="inline-block rounded-lg bg-black px-12 py-5 text-xl font-bold text-white transition-transform hover:scale-105"
              >
                Criar minha conta agora
              </Link>
            </div>
          </div>
        </FadeInView>
      </main>
      <LandingFooter />
    </div>
  );
}
