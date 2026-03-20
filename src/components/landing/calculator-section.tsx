"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeInView } from "@/components/landing/fade-in-view";

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const DEPRECIATION_PER_KM = 0.1;
const HOURS_MONTH_ESTIMATE = 160;

function parseMoney(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function CalculatorSection() {
  const [gross, setGross] = useState("");
  const [fuel, setFuel] = useState("");
  const [km, setKm] = useState("");
  const [animKey, setAnimKey] = useState(0);

  const result = useMemo(() => {
    const g = parseMoney(gross);
    const f = parseMoney(fuel);
    const k = parseMoney(km);
    const depreciation = k * DEPRECIATION_PER_KM;
    const net = Math.max(0, g - f - depreciation);
    const costKm = k > 0 ? f / k : 0;
    const profitHour =
      net > 0 && HOURS_MONTH_ESTIMATE > 0 ? net / HOURS_MONTH_ESTIMATE : 0;
    return { net, costKm, profitHour, hasInput: g > 0 || f > 0 || k > 0 };
  }, [gross, fuel, km]);

  const handleCalc = () => {
    setAnimKey((k) => k + 1);
    document
      .getElementById("calc-result")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <FadeInView
      className="bg-[#f3f3f3] px-6 py-24"
      id="calculator"
      aria-labelledby="calculator-heading"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h2
            id="calculator-heading"
            className="mb-4 text-4xl font-black tracking-tighter text-[#1a1c1c]"
          >
            Quanto você ganha de verdade?
          </h2>
          <p className="text-[#474747]">
            Simule seus custos operacionais em segundos.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-12 rounded-[2rem] bg-white p-8 shadow-sm md:grid-cols-2 md:p-12">
          <div className="space-y-6">
            <div>
              <Label
                htmlFor="calc-gross"
                className="mb-2 block text-sm font-bold"
              >
                Faturamento Mensal Bruto (R$)
              </Label>
              <Input
                id="calc-gross"
                inputMode="decimal"
                placeholder="Ex: 6000"
                value={gross}
                onChange={(e) => setGross(e.target.value)}
                className="h-12 rounded-lg border-0 bg-[#e8e8e8] focus-visible:ring-2 focus-visible:ring-[#006d33]"
              />
            </div>
            <div>
              <Label
                htmlFor="calc-fuel"
                className="mb-2 block text-sm font-bold"
              >
                Gasto Mensal com Combustível (R$)
              </Label>
              <Input
                id="calc-fuel"
                inputMode="decimal"
                placeholder="Ex: 2200"
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                className="h-12 rounded-lg border-0 bg-[#e8e8e8] focus-visible:ring-2 focus-visible:ring-[#006d33]"
              />
            </div>
            <div>
              <Label htmlFor="calc-km" className="mb-2 block text-sm font-bold">
                KM rodados no mês
              </Label>
              <Input
                id="calc-km"
                inputMode="decimal"
                placeholder="Ex: 3500"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                className="h-12 rounded-lg border-0 bg-[#e8e8e8] focus-visible:ring-2 focus-visible:ring-[#006d33]"
              />
            </div>
            <p className="text-xs text-[#777777]">
              {`Estimativa: faturamento − combustível − (km × R$ ${DEPRECIATION_PER_KM.toFixed(2)}/km de depreciação). ~${HOURS_MONTH_ESTIMATE} h/mês para lucro/hora.`}
            </p>
            <button
              type="button"
              onClick={handleCalc}
              className="w-full rounded-lg bg-black py-4 font-bold text-white transition-opacity hover:opacity-90"
            >
              Calcular meu lucro real
            </button>
          </div>
          <motion.div
            id="calc-result"
            className="flex flex-col justify-center rounded-2xl border-l-4 border-[#006d33] bg-[#eeeeee] p-8"
          >
            <span className="mb-2 text-sm font-bold text-[#474747]">
              Lucro líquido estimado
            </span>
            <motion.div
              key={animKey}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8 text-5xl font-black tracking-tighter text-[#006d33]"
            >
              {result.hasInput ? fmt.format(result.net) : "—"}
            </motion.div>
            <div className="space-y-4">
              <motion.div
                key={`row-km-${animKey}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="flex items-center justify-between border-b border-[#c6c6c6]/40 py-2"
              >
                <span className="text-sm text-[#474747]">
                  Custo por km (combustível)
                </span>
                <span className="font-bold text-[#1a1c1c]">
                  {result.hasInput && parseMoney(km) > 0
                    ? fmt.format(result.costKm)
                    : "—"}
                </span>
              </motion.div>
              <motion.div
                key={`row-h-${animKey}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex items-center justify-between border-b border-[#c6c6c6]/40 py-2"
              >
                <span className="text-sm text-[#474747]">
                  Lucro por hora (est. ~{HOURS_MONTH_ESTIMATE} h/mês)
                </span>
                <span className="font-bold text-[#1a1c1c]">
                  {result.hasInput ? fmt.format(result.profitHour) : "—"}
                </span>
              </motion.div>
            </div>
            <Link
              href="/cadastro"
              className="mt-8 flex h-12 w-full items-center justify-center rounded-lg bg-black font-bold text-white transition-opacity hover:opacity-90"
            >
              Criar conta e registrar de verdade
            </Link>
          </motion.div>
        </div>
      </div>
    </FadeInView>
  );
}
