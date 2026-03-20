"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, ArrowRight, CircleHelp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressSteps } from "@/components/onboarding/progress-steps";
import { cn } from "@/lib/utils";

const MAX_YEAR = 2026;

const vehicleFormSchema = z.object({
  model: z.string().min(1, "Informe o modelo"),
  year: z.coerce
    .number({ invalid_type_error: "Informe o ano" })
    .int()
    .min(1990, "Ano mínimo 1990")
    .max(MAX_YEAR, `Ano máximo ${MAX_YEAR}`),
  fuelConsumption: z.coerce
    .number({ invalid_type_error: "Informe o consumo" })
    .min(3, "Mínimo 3 km/l")
    .max(30, "Máximo 30 km/l"),
  fuelPrice: z.coerce
    .number({ invalid_type_error: "Informe o preço" })
    .min(3, "Mínimo R$ 3/l")
    .max(15, "Máximo R$ 15/l"),
  currentOdometer: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().min(0, "Km não pode ser negativo").optional(),
  ),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

const fieldClass =
  "h-auto rounded-b-xl border-0 border-b-2 border-transparent bg-[#e8e8e8] px-4 py-4 text-base shadow-none transition-colors focus-visible:border-[#006d33] focus-visible:ring-0";

const labelClass =
  "mb-2 block text-xs font-bold tracking-wider text-black uppercase";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function VeiculoForm() {
  const router = useRouter();
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      model: "",
      year: undefined as unknown as number,
      fuelConsumption: undefined as unknown as number,
      fuelPrice: undefined as unknown as number,
      currentOdometer: undefined,
    },
    mode: "onChange",
  });

  const consumption = form.watch("fuelConsumption");
  const price = form.watch("fuelPrice");

  const costPerKm = useMemo(() => {
    const c = Number(consumption);
    const p = Number(price);
    if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(p) || p <= 0) {
      return null;
    }
    return p / c;
  }, [consumption, price]);

  async function onSubmit(data: VehicleFormValues) {
    const res = await fetch("/api/vehicle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: data.model.trim(),
        year: data.year,
        fuelConsumption: data.fuelConsumption,
        fuelPrice: data.fuelPrice,
        ...(data.currentOdometer !== undefined
          ? { currentOdometer: data.currentOdometer }
          : {}),
      }),
    });

    const json = (await res.json()) as {
      data: unknown;
      error: { code: string; message: string } | null;
    };

    if (!res.ok || json.error) {
      toast.error(json.error?.message ?? "Não foi possível salvar.");
      return;
    }

    toast.success("Veículo salvo!");
    router.push("/onboarding/plataformas");
    router.refresh();
  }

  const pending = form.formState.isSubmitting;

  return (
    <div className="min-h-screen bg-white text-[#1a1c1c] antialiased">
      <header className="sticky top-0 z-50 w-full bg-[#f9f9f9]">
        <div className="mx-auto flex h-20 max-w-screen-xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-black transition-transform active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-6" strokeWidth={2} />
            </Link>
            <span className="text-xl font-bold tracking-tight text-black uppercase">
              Piloto
            </span>
          </div>
          <button
            type="button"
            className="text-black transition-transform active:scale-95"
            aria-label="Ajuda"
          >
            <CircleHelp className="size-6" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[520px] px-6 py-12 pb-24 md:px-6 md:py-12">
        <ProgressSteps />

        <section className="mb-12">
          <h1 className="mb-4 text-[2.5rem] leading-[1.1] font-black tracking-tight text-black">
            Conte-nos sobre seu carro
          </h1>
          <p className="text-lg leading-relaxed text-[#474747]">
            Essas informações calculam automaticamente seu custo por km rodado.
          </p>
        </section>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="model" className={labelClass}>
                Modelo do veículo
              </Label>
              <Input
                id="model"
                placeholder="Ex: Toyota Corolla 2020"
                disabled={pending}
                className={cn(fieldClass, form.formState.errors.model && "border-b-[#ba1a1a]")}
                {...form.register("model")}
              />
              {form.formState.errors.model && (
                <p className="mt-1 text-xs text-[#ba1a1a]">
                  {form.formState.errors.model.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year" className={labelClass}>
                  Ano
                </Label>
                <Input
                  id="year"
                  type="number"
                  inputMode="numeric"
                  placeholder="2020"
                  disabled={pending}
                  className={cn(fieldClass, form.formState.errors.year && "border-b-[#ba1a1a]")}
                  {...form.register("year")}
                />
                {form.formState.errors.year && (
                  <p className="mt-1 text-xs text-[#ba1a1a]">
                    {form.formState.errors.year.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="fuelConsumption" className={labelClass}>
                  Consumo médio
                </Label>
                <div className="relative">
                  <Input
                    id="fuelConsumption"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="12,5"
                    disabled={pending}
                    className={cn(
                      fieldClass,
                      "pr-14",
                      form.formState.errors.fuelConsumption && "border-b-[#ba1a1a]",
                    )}
                    {...form.register("fuelConsumption")}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium text-[#474747]">
                    km/l
                  </span>
                </div>
                {form.formState.errors.fuelConsumption && (
                  <p className="mt-1 text-xs text-[#ba1a1a]">
                    {form.formState.errors.fuelConsumption.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="fuelPrice" className={labelClass}>
                Preço do combustível
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-sm font-bold text-[#474747]">
                  R$
                </span>
                <Input
                  id="fuelPrice"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="5,89"
                  disabled={pending}
                  className={cn(
                    fieldClass,
                    "pl-10 pr-24",
                    form.formState.errors.fuelPrice && "border-b-[#ba1a1a]",
                  )}
                  {...form.register("fuelPrice")}
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium text-[#474747]">
                  /litro
                </span>
              </div>
              {form.formState.errors.fuelPrice && (
                <p className="mt-1 text-xs text-[#ba1a1a]">
                  {form.formState.errors.fuelPrice.message}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="currentOdometer" className={cn(labelClass, "mb-0")}>
                  Km atual
                </Label>
                <span className="text-[10px] font-bold tracking-widest text-[#777777] uppercase">
                  Opcional
                </span>
              </div>
              <div className="relative">
                <Input
                  id="currentOdometer"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="45000"
                  disabled={pending}
                  className={cn(
                    fieldClass,
                    "pr-12",
                    form.formState.errors.currentOdometer && "border-b-[#ba1a1a]",
                  )}
                  {...form.register("currentOdometer")}
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium text-[#474747]">
                  km
                </span>
              </div>
              {form.formState.errors.currentOdometer && (
                <p className="mt-1 text-xs text-[#ba1a1a]">
                  {form.formState.errors.currentOdometer.message}
                </p>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-black p-8 shadow-2xl">
            <div className="absolute -top-12 -right-12 size-32 rounded-full bg-[#006d33] opacity-20 blur-3xl" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <p className="mb-4 text-[10px] font-black tracking-[0.2em] text-[#5adf82] uppercase">
                Eficiência calculada
              </p>
              <div className="mb-2 flex items-baseline gap-1">
                <span className="text-lg font-bold text-white">R$</span>
                <span className="text-5xl font-black tracking-tighter text-white">
                  {costPerKm !== null
                    ? costPerKm.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-white/85">
                {costPerKm !== null ? (
                  <>
                    Com esses dados, seu custo estimado é de{" "}
                    <span className="font-bold text-white">{money.format(costPerKm)}</span> por
                    km
                  </>
                ) : (
                  "Informe consumo e preço do combustível para estimar o custo por km."
                )}
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="flex h-auto w-full items-center justify-center gap-3 rounded-lg bg-black py-5 text-lg font-black text-white shadow-lg shadow-black/10 transition-transform hover:bg-zinc-900 active:scale-[0.98]"
          >
            Próximo
            <ArrowRight className="size-5" strokeWidth={2.5} />
          </Button>
        </form>

        <p className="mt-12 text-center text-xs font-medium tracking-widest text-[#777777] uppercase">
          Privacidade garantida — dados protegidos
        </p>
      </main>

      <div className="pointer-events-none fixed inset-0 -z-10 bg-white">
        <div className="absolute top-[20%] -left-[10%] h-[40%] w-[40%] rounded-full bg-[#f3f3f3] blur-[120px]" />
        <div className="absolute right-[-10%] bottom-[10%] h-[30%] w-[30%] rounded-full bg-[#e8e8e8] blur-[100px]" />
      </div>
    </div>
  );
}
