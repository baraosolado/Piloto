"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Car, Loader2, MapPin, Save, Smartphone, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import {
  calculateRideCost,
  calculateRideProfit,
  type Vehicle,
} from "@/lib/calculations";

const PLATFORMS = [
  {
    id: "uber" as const,
    label: "Uber",
    short: "Uber",
    icon: Car,
  },
  {
    id: "99" as const,
    label: "99",
    short: "99",
    icon: Smartphone,
  },
  {
    id: "indrive" as const,
    label: "inDrive",
    short: "inDrive",
    icon: MapPin,
  },
  {
    id: "particular" as const,
    label: "Particular",
    short: "Partic.",
    icon: User,
  },
];

export type RideFormRide = {
  id: string;
  platform: (typeof PLATFORMS)[number]["id"];
  grossAmount: number;
  distanceKm: number;
  startedAt: string;
  durationMinutes: number | null;
  notes: string | null;
};

export type RideFormDrawerProps = {
  vehicle: Vehicle | null;
  /** Preenchido em modo edição. */
  ride?: RideFormRide | null;
  /** Gatilho visual (abre ao clicar). Com `open` controlado, omitir e abrir via estado. */
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Chamado após salvar com sucesso (ex.: refetch da lista no cliente). */
  onSaved?: () => void;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function defaultDatetimeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return defaultDatetimeLocal();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDecimalInput(raw: string): number {
  const n = Number.parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return n;
}

const fieldClass =
  "h-auto rounded-b-xl border-0 border-b-2 border-transparent bg-[#e8e8e8] px-4 py-4 text-base font-bold shadow-none transition-colors focus-visible:border-[#006d33] focus-visible:ring-0 md:text-lg";

const labelClass =
  "text-xs font-bold tracking-widest text-[#474747] uppercase";

type FormState = {
  platform: (typeof PLATFORMS)[number]["id"];
  gross: string;
  distance: string;
  startedAt: string;
  duration: string;
  notes: string;
};

function emptyForm(): FormState {
  return {
    platform: "uber",
    gross: "",
    distance: "",
    startedAt: defaultDatetimeLocal(),
    duration: "",
    notes: "",
  };
}

function formFromRide(ride: RideFormRide): FormState {
  return {
    platform: ride.platform,
    gross: String(ride.grossAmount).replace(".", ","),
    distance: String(ride.distanceKm).replace(".", ","),
    startedAt: isoToDatetimeLocal(ride.startedAt),
    duration:
      ride.durationMinutes !== null && ride.durationMinutes > 0
        ? String(ride.durationMinutes)
        : "",
    notes: ride.notes ?? "",
  };
}

function RideFormBody({
  vehicle,
  ride,
  open,
  onClose,
  onLimitReached,
  onSaved,
}: {
  vehicle: Vehicle | null;
  ride?: RideFormRide | null;
  open: boolean;
  onClose: () => void;
  onLimitReached: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    ride ? formFromRide(ride) : emptyForm(),
  );
  const [pending, setPending] = useState(false);

  const isEdit = Boolean(ride?.id);

  useEffect(() => {
    if (!open) return;
    setForm(ride ? formFromRide(ride) : emptyForm());
  }, [open, ride]);

  const grossNum = parseDecimalInput(form.gross);
  const distanceNum = parseDecimalInput(form.distance);

  const preview = useMemo(() => {
    if (!vehicle || !Number.isFinite(distanceNum) || distanceNum <= 0) {
      return {
        cost: null as number | null,
        profit: null as number | null,
        profitPerKm: null as number | null,
      };
    }
    const cost = calculateRideCost(distanceNum, vehicle);
    if (Number.isNaN(cost)) {
      return { cost: null, profit: null, profitPerKm: null };
    }
    const grossOk = Number.isFinite(grossNum) && grossNum > 0;
    const profit = grossOk ? calculateRideProfit(grossNum, cost) : null;
    const profitPerKm =
      profit !== null && distanceNum > 0 ? profit / distanceNum : null;
    return { cost, profit, profitPerKm };
  }, [vehicle, grossNum, distanceNum]);

  const submit = async () => {
    if (!PLATFORMS.some((p) => p.id === form.platform)) {
      toast.error("Selecione a plataforma.");
      return;
    }
    if (!Number.isFinite(grossNum) || grossNum <= 0) {
      toast.error("Informe o valor bruto.");
      return;
    }
    if (!Number.isFinite(distanceNum) || distanceNum <= 0) {
      toast.error("Informe a distância em km.");
      return;
    }
    const started = new Date(form.startedAt);
    if (Number.isNaN(started.getTime())) {
      toast.error("Data e hora inválidas.");
      return;
    }
    let durationMinutes: number | null = null;
    if (form.duration.trim() !== "") {
      const d = Number.parseInt(form.duration, 10);
      if (!Number.isFinite(d) || d <= 0) {
        toast.error("Duração inválida.");
        return;
      }
      durationMinutes = d;
    }

    const body = isEdit
      ? {
          platform: form.platform,
          grossAmount: grossNum,
          distanceKm: distanceNum,
          startedAt: started.toISOString(),
          durationMinutes,
          notes: form.notes.trim() ? form.notes.trim() : null,
        }
      : {
          platform: form.platform,
          grossAmount: grossNum,
          distanceKm: distanceNum,
          startedAt: started.toISOString(),
          durationMinutes,
          notes: form.notes.trim() || undefined,
        };

    setPending(true);
    try {
      const url = isEdit ? `/api/rides/${ride!.id}` : "/api/rides";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        data: { profit?: number | null; ride?: { profit?: number } } | null;
        error: { code: string; message: string } | null;
      };

      if (res.status === 403 && json.error?.code === "LIMIT_REACHED") {
        onClose();
        onLimitReached();
        toast.error(json.error.message);
        return;
      }

      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Não foi possível salvar.");
        return;
      }

      const profitVal =
        json.data && typeof json.data === "object" && "profit" in json.data
          ? json.data.profit
          : null;
      const profitFmt =
        typeof profitVal === "number" && !Number.isNaN(profitVal)
          ? money.format(profitVal)
          : preview.profit !== null
            ? money.format(preview.profit)
            : "—";

      toast.success(`Corrida salva! Lucro: ${profitFmt}`);
      setForm(emptyForm());
      onClose();
      onSaved?.();
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-0 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-3">
          <Label className={labelClass}>Plataforma</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PLATFORMS.map(({ id, label, short, icon: Icon }) => {
              const on = form.platform === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, platform: id }))}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all duration-150",
                    on
                      ? "border-black bg-black text-white"
                      : "border-transparent bg-[#f3f3f3] hover:bg-[#eeeeee]",
                  )}
                >
                  <Icon className="mb-1 size-5" strokeWidth={1.75} />
                  <span className="text-[10px] font-bold tracking-tight uppercase">
                    {short}
                  </span>
                  <span className="sr-only">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ride-gross" className={labelClass}>
              Valor bruto da corrida
            </Label>
            <div className="relative">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-[#474747]">
                R$
              </span>
              <Input
                id="ride-gross"
                inputMode="decimal"
                placeholder="0,00"
                value={form.gross}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gross: e.target.value }))
                }
                className={cn(fieldClass, "pl-11")}
              />
            </div>
            <span className="text-[10px] text-[#777777]">Valor recebido</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ride-km" className={labelClass}>
              Km rodados
            </Label>
            <div className="relative">
              <Input
                id="ride-km"
                inputMode="decimal"
                placeholder="0,0"
                value={form.distance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, distance: e.target.value }))
                }
                className={cn(fieldClass, "pr-14")}
              />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 font-bold text-[#474747]">
                km
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ride-when" className={labelClass}>
              Data e hora
            </Label>
            <Input
              id="ride-when"
              type="datetime-local"
              value={form.startedAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, startedAt: e.target.value }))
              }
              className={cn(fieldClass, "text-sm font-medium")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ride-dur" className={labelClass}>
              Duração (opcional)
            </Label>
            <div className="relative">
              <Input
                id="ride-dur"
                inputMode="numeric"
                placeholder="—"
                value={form.duration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration: e.target.value }))
                }
                className={cn(fieldClass, "pr-14")}
              />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 font-bold text-[#474747]">
                min
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ride-notes" className={labelClass}>
            Observação
          </Label>
          <textarea
            id="ride-notes"
            rows={3}
            placeholder="Ex.: passageiro educado, gorjeta no app…"
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
            className={cn(
              fieldClass,
              "min-h-[88px] resize-none text-sm font-medium",
            )}
          />
        </div>

        <div className="space-y-4 rounded-2xl bg-black p-6 text-white">
          {!vehicle ? (
            <p className="text-sm text-white/80">
              Cadastre o veículo no onboarding para ver custo e lucro estimados.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between opacity-90">
                <span className="text-sm font-medium">Custo estimado</span>
                <span className="font-bold">
                  {preview.cost === null ? "—" : money.format(preview.cost)}
                </span>
              </div>
              <div className="h-px w-full bg-white/10" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold tracking-widest text-[#5adf82] uppercase">
                    Lucro líquido
                  </span>
                  <div
                    className={cn(
                      "text-3xl font-black",
                      preview.profit !== null && preview.profit >= 0
                        ? "text-[#5adf82]"
                        : "text-[#ff6b6b]",
                    )}
                  >
                    {preview.profit === null
                      ? "—"
                      : money.format(preview.profit)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] tracking-widest text-white/60 uppercase">
                    Lucro por km
                  </span>
                  <div className="text-lg font-bold">
                    {preview.profitPerKm === null
                      ? "—"
                      : money.format(preview.profitPerKm)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="shrink-0 space-y-3 border-t border-border bg-background pt-3"
        style={{
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Button
          type="button"
          disabled={pending}
          onClick={submit}
          className="h-12 w-full gap-2 bg-black text-base font-bold hover:bg-black/90"
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Salvando...
            </span>
          ) : (
            <>
              <Save className="size-5" strokeWidth={2} aria-hidden />
              Salvar corrida
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full font-bold text-[#474747]"
          onClick={onClose}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function RideFormDrawer({
  vehicle,
  ride,
  children,
  open: openProp,
  onOpenChange,
  onSaved,
}: RideFormDrawerProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [internalOpen, setInternalOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const title = ride ? "Editar corrida" : "Nova corrida";

  const sharedForm = (
    <RideFormBody
      vehicle={vehicle}
      ride={ride}
      open={open}
      onClose={() => setOpen(false)}
      onLimitReached={() => setUpgradeOpen(true)}
      onSaved={onSaved}
    />
  );

  const upgradeModal = (
    <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Limite do plano gratuito</DialogTitle>
          <DialogDescription>
            Você atingiu o limite de corridas deste mês. Faça upgrade para
            registrar corridas ilimitadas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-stretch">
          <Button asChild className="bg-black">
            <Link href="/planos" onClick={() => setUpgradeOpen(false)}>
              Ver planos
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setUpgradeOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <>
        <Drawer
          direction="bottom"
          open={open}
          onOpenChange={setOpen}
          repositionInputs={false}
        >
          {children ? (
            <DrawerTrigger asChild>{children}</DrawerTrigger>
          ) : null}
          <DrawerContent className="flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[2rem] border-t bg-white px-6 pb-0 pt-0">
            <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-[#c6c6c6]/40" />
            <DrawerHeader className="shrink-0 px-0 pt-4 pb-2 text-left">
              <DrawerTitle className="text-2xl font-bold tracking-tight">
                {title}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {sharedForm}
            </div>
          </DrawerContent>
        </Drawer>
        {upgradeModal}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
        <DialogContent
          className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6">
            {sharedForm}
          </div>
        </DialogContent>
      </Dialog>
      {upgradeModal}
    </>
  );
}
