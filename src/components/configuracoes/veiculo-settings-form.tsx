"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_YEAR = new Date().getFullYear() + 1;

const schema = z.object({
  model: z.string().min(1, "Informe o modelo"),
  year: z.coerce
    .number({ invalid_type_error: "Informe o ano" })
    .int()
    .min(1990)
    .max(MAX_YEAR),
  fuelConsumption: z.coerce
    .number({ invalid_type_error: "Informe o consumo" })
    .min(3)
    .max(30),
  fuelPrice: z.coerce
    .number({ invalid_type_error: "Informe o preço" })
    .min(3)
    .max(15),
  currentOdometer: z.coerce
    .number({ invalid_type_error: "Informe o odômetro" })
    .int()
    .min(0),
  depreciationPerKm: z.coerce
    .number({ invalid_type_error: "Informe a depreciação" })
    .min(0)
    .max(5),
});

export type VeiculoSettingsValues = z.infer<typeof schema>;

const labelClass =
  "mb-2 ml-1 block text-xs font-bold tracking-wider text-[#474747] uppercase";

const fieldClass =
  "h-auto rounded-b-lg border-0 border-b-2 border-transparent bg-[#e8e8e8] px-4 py-4 text-base shadow-none transition-colors focus-visible:border-[#006d33] focus-visible:ring-0";

type Props = {
  defaultValues: VeiculoSettingsValues;
};

export function VeiculoSettingsForm({ defaultValues }: Props) {
  const router = useRouter();
  const form = useForm<VeiculoSettingsValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onChange",
  });

  const consumption = form.watch("fuelConsumption");
  const price = form.watch("fuelPrice");
  const dep = form.watch("depreciationPerKm");

  const totalPerKm = useMemo(() => {
    const c = Number(consumption);
    const p = Number(price);
    const d = Number(dep);
    if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(p) || p <= 0) {
      return null;
    }
    const fuel = p / c;
    const depPart = Number.isFinite(d) && d >= 0 ? d : 0;
    return fuel + depPart;
  }, [consumption, price, dep]);

  async function onSubmit(data: VeiculoSettingsValues) {
    const res = await fetch("/api/vehicle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        model: data.model.trim(),
        year: data.year,
        fuelConsumption: data.fuelConsumption,
        fuelPrice: data.fuelPrice,
        currentOdometer: data.currentOdometer,
        depreciationPerKm: data.depreciationPerKm,
      }),
    });
    const json = (await res.json()) as {
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      toast.error(json.error?.message ?? "Não foi possível salvar.");
      return;
    }
    toast.success("Veículo atualizado.");
    router.refresh();
  }

  const pending = form.formState.isSubmitting;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-lg space-y-6">
      <section className="flex flex-col items-center justify-center rounded-xl bg-[#f3f3f3] p-6 text-center">
        <span className="mb-1 text-xs font-medium tracking-widest text-[#474747] uppercase">
          Custo estimado (combustível + depreciação)
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-black">R$</span>
          <span className="text-5xl font-black tracking-tighter text-black">
            {totalPerKm !== null
              ? totalPerKm.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "—"}
          </span>
          <span className="text-lg font-bold text-[#474747]">/km</span>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold text-[#006d33]">
          <TrendingUp className="size-4" aria-hidden />
          Atualiza em tempo real conforme os campos
        </p>
      </section>

      <div className="space-y-4">
        <h2 className="text-base font-bold text-black">Informações gerais</h2>
        <div>
          <Label htmlFor="vs-model" className={labelClass}>
            Modelo
          </Label>
          <Input
            id="vs-model"
            disabled={pending}
            className={cn(fieldClass, form.formState.errors.model && "border-b-destructive")}
            {...form.register("model")}
          />
          {form.formState.errors.model && (
            <p className="mt-1 text-xs text-destructive">
              {form.formState.errors.model.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <Label htmlFor="vs-year" className={labelClass}>
              Ano
            </Label>
            <Input
              id="vs-year"
              type="number"
              inputMode="numeric"
              disabled={pending}
              className={cn(fieldClass, form.formState.errors.year && "border-b-destructive")}
              {...form.register("year")}
            />
          </div>
          <div className="col-span-3">
            <Label htmlFor="vs-odo" className={labelClass}>
              Odômetro atual (km)
            </Label>
            <Input
              id="vs-odo"
              type="number"
              inputMode="numeric"
              min={0}
              disabled={pending}
              className={cn(
                fieldClass,
                form.formState.errors.currentOdometer && "border-b-destructive",
              )}
              {...form.register("currentOdometer")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <h2 className="text-base font-bold text-black">Consumo e custos</h2>
        <div>
          <Label htmlFor="vs-cons" className={labelClass}>
            Consumo médio (km/L)
          </Label>
          <Input
            id="vs-cons"
            type="number"
            inputMode="decimal"
            step="0.1"
            disabled={pending}
            className={cn(
              fieldClass,
              form.formState.errors.fuelConsumption && "border-b-destructive",
            )}
            {...form.register("fuelConsumption")}
          />
        </div>
        <div>
          <Label htmlFor="vs-price" className={labelClass}>
            Preço do combustível (R$/L)
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-sm font-bold text-[#474747]">
              R$
            </span>
            <Input
              id="vs-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={pending}
              className={cn(
                fieldClass,
                "pl-10",
                form.formState.errors.fuelPrice && "border-b-destructive",
              )}
              {...form.register("fuelPrice")}
            />
          </div>
        </div>
        <div className="rounded-r-lg border-l-4 border-black bg-white p-4 shadow-sm">
          <Label htmlFor="vs-dep" className={cn(labelClass, "text-black")}>
            Custo de depreciação por km (R$/km)
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-sm font-bold text-black">
              R$
            </span>
            <Input
              id="vs-dep"
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={pending}
              className={cn(
                fieldClass,
                "pl-10",
                form.formState.errors.depreciationPerKm && "border-b-destructive",
              )}
              {...form.register("depreciationPerKm")}
            />
          </div>
          <p className="mt-2 text-[10px] leading-tight text-[#474747]">
            Sugestão: R$ 0,10 cobre manutenção básica e desvalorização gradual.
          </p>
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="flex h-auto w-full items-center justify-center gap-3 rounded-lg bg-black py-5 text-xl font-black tracking-tight text-white uppercase shadow-xl hover:bg-zinc-900"
      >
        {pending ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <>
            Salvar
            <CheckCircle2 className="size-6" />
          </>
        )}
      </Button>
    </form>
  );
}
