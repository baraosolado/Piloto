"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Info,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { ProgressStepDots } from "@/components/onboarding/progress-steps";

const MIN = 500;
const MAX = 10000;
const STEP = 100;
const WORKING_DAYS = 22;
const RIDES_PER_DAY = 8;

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function clamp(n: number): number {
  return Math.min(MAX, Math.max(MIN, n));
}

function snapToStep(n: number): number {
  const s = Math.round(n / STEP) * STEP;
  return clamp(s);
}

export function MetaForm() {
  const router = useRouter();
  const [monthly, setMonthly] = useState(3000);
  const [inputText, setInputText] = useState("3000");
  const [pending, setPending] = useState(false);

  const daily = monthly / WORKING_DAYS;
  const perRide = daily / RIDES_PER_DAY;

  const syncInputFromNumber = useCallback((n: number) => {
    const v = snapToStep(n);
    setMonthly(v);
    setInputText(String(v));
  }, []);

  const onInputChange = (raw: string) => {
    setInputText(raw);
    const digits = raw.replace(/\D/g, "");
    if (digits === "") return;
    const n = Number.parseInt(digits, 10);
    if (Number.isNaN(n)) return;
    setMonthly(clamp(n));
  };

  const onInputBlur = () => {
    syncInputFromNumber(monthly);
  };

  const onSliderChange = (v: number) => {
    syncInputFromNumber(v);
  };

  const handleSubmit = async () => {
    const target = snapToStep(monthly);
    setMonthly(target);
    setInputText(String(target));

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    setPending(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyTarget: target,
          month,
          year,
        }),
      });

      const json = (await res.json()) as {
        data: unknown;
        error: { code: string; message: string } | null;
      };

      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Não foi possível salvar a meta.");
        return;
      }

      router.push("/dashboard?onboarding=complete");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const sliderId = useMemo(() => "meta-profit-range", []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f9f9] text-[#1a1c1c] antialiased">
      <header className="sticky top-0 z-40 w-full bg-white shadow-sm shadow-black/5">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between px-6 py-4">
          <Link
            href="/onboarding/plataformas"
            className="rounded-full p-2 text-black transition-colors hover:bg-gray-100 active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-6" strokeWidth={2} />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-black">
            Passo 3 de 3
          </h1>
          <div className="w-10 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-6 pt-8 pb-40">
        <ProgressStepDots />

        <section className="mb-12 text-center">
          <h2 className="mb-4 text-3xl leading-tight font-bold tracking-tight text-black">
            Qual é sua meta de lucro mensal?
          </h2>
          <p className="text-base leading-relaxed text-[#474747]">
            Lucro líquido — o que sobra depois de pagar combustível e manutenção.
          </p>
        </section>

        <section className="mb-12">
          <label
            htmlFor="monthly-profit"
            className="mb-6 block text-center text-sm font-bold tracking-wide text-[#474747] uppercase"
          >
            Quanto você quer lucrar por mês?
          </label>

          <div className="mb-8 flex flex-col items-center space-y-8">
            <div className="relative w-full text-center">
              <span className="mb-2 block text-sm font-bold tracking-widest text-[#474747] uppercase">
                Valor estimado
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span
                  className="text-[32px] font-bold text-black md:text-[36px]"
                  aria-hidden
                >
                  R$
                </span>
                <input
                  id="monthly-profit"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="3000"
                  value={inputText}
                  onChange={(e) => onInputChange(e.target.value)}
                  onBlur={onInputBlur}
                  className="min-w-0 max-w-[70%] border-0 bg-transparent text-center text-[32px] font-bold text-black shadow-none outline-none focus:ring-0 md:text-[36px]"
                />
              </div>
              <div className="mx-auto mt-2 h-1 w-24 bg-[#006d33]" />
            </div>

            <div className="w-full px-2">
              <label htmlFor={sliderId} className="sr-only">
                Ajustar meta mensal entre {money.format(MIN)} e {money.format(MAX)}
              </label>
              <input
                id={sliderId}
                type="range"
                min={MIN}
                max={MAX}
                step={STEP}
                value={monthly}
                onChange={(e) => onSliderChange(Number(e.target.value))}
                className="meta-profit-slider h-2 w-full cursor-pointer rounded-lg"
              />
              <div className="mt-4 flex justify-between text-xs font-bold tracking-wider text-[#777777] uppercase">
                <span>{money.format(MIN)}</span>
                <span>{money.format(MAX)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-[#eeeeee] bg-white p-6 transition-colors hover:border-[#006d33]">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#474747]">Meta diária</p>
              <p className="text-2xl font-bold text-black">{money.format(daily)}</p>
            </div>
            <span className="rounded-full bg-[#eeeeee] px-3 py-1 text-xs font-bold text-black">
              {WORKING_DAYS} dias úteis
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#eeeeee] bg-white p-6 transition-colors hover:border-[#006d33]">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#474747]">
                Meta por corrida
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-black">
                  {money.format(perRide)}
                </p>
                <TrendingUp
                  className="size-5 text-[#006d33]"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
            </div>
            <span className="rounded-full bg-[#eeeeee] px-3 py-1 text-xs font-bold text-black">
              {RIDES_PER_DAY} corridas/dia
            </span>
          </div>
        </section>

        <div className="mt-8 flex gap-3 rounded-r-xl border-l-4 border-[#006d33] bg-[#6aee8f]/10 p-4">
          <Info
            className="size-5 shrink-0 text-[#006d33]"
            strokeWidth={2}
            aria-hidden
          />
          <p className="text-sm leading-snug text-[#00461e]">
            Sua meta ajuda o <strong>Piloto</strong> a calcular quanto você precisa
            faturar por hora em tempo real.
          </p>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-between rounded-t-3xl border-t border-gray-100 bg-white px-6 pt-4 pb-10 shadow-2xl">
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push("/onboarding/plataformas")}
          className="flex flex-col items-center justify-center py-3 text-gray-500 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          <ChevronLeft className="mb-1 size-6" strokeWidth={2} />
          <span className="text-sm font-medium">Voltar</span>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="flex max-w-[280px] flex-1 items-center justify-center gap-2 rounded-xl bg-black py-4 px-6 text-base font-bold text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
        >
          Começar a usar o Piloto
          <ArrowRight className="size-5" strokeWidth={2.5} />
        </button>
      </nav>
    </div>
  );
}
