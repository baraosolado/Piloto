"use client";

import {
  AlertTriangle,
  Fuel,
  Loader2,
  MoreHorizontal,
  Save,
  Shield,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format, parse, parseISO, startOfDay } from "date-fns";
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

const CATEGORIES = [
  {
    id: "fuel" as const,
    label: "Combustível",
    short: "Comb.",
    icon: Fuel,
    onClass:
      "border-orange-500 bg-orange-50 text-orange-950 shadow-sm ring-1 ring-orange-500/20",
    offClass: "border-transparent bg-[#f3f3f3] hover:bg-[#eeeeee]",
  },
  {
    id: "maintenance" as const,
    label: "Manutenção",
    short: "Manut.",
    icon: Wrench,
    onClass:
      "border-blue-500 bg-blue-50 text-blue-950 shadow-sm ring-1 ring-blue-500/20",
    offClass: "border-transparent bg-[#f3f3f3] hover:bg-[#eeeeee]",
  },
  {
    id: "insurance" as const,
    label: "Seguro",
    short: "Seguro",
    icon: Shield,
    onClass:
      "border-violet-500 bg-violet-50 text-violet-950 shadow-sm ring-1 ring-violet-500/20",
    offClass: "border-transparent bg-[#f3f3f3] hover:bg-[#eeeeee]",
  },
  {
    id: "fine" as const,
    label: "Multa",
    short: "Multa",
    icon: AlertTriangle,
    onClass:
      "border-red-500 bg-red-50 text-red-950 shadow-sm ring-1 ring-red-500/20",
    offClass: "border-transparent bg-[#f3f3f3] hover:bg-[#eeeeee]",
  },
  {
    id: "other" as const,
    label: "Outros",
    short: "Outros",
    icon: MoreHorizontal,
    onClass:
      "border-neutral-400 bg-neutral-100 text-neutral-900 shadow-sm ring-1 ring-neutral-400/30",
    offClass: "border-transparent bg-[#f3f3f3] hover:bg-[#eeeeee]",
  },
];

export type ExpenseFormExpense = {
  id: string;
  category: (typeof CATEGORIES)[number]["id"];
  amount: number;
  odometer: number | null;
  liters: number | null;
  description: string | null;
  occurredAt: string;
};

export type ExpenseFormDrawerProps = {
  expense?: ExpenseFormExpense | null;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => void;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fieldClass =
  "h-auto rounded-b-xl border-0 border-b-2 border-transparent bg-[#e8e8e8] px-4 py-4 text-base font-bold shadow-none transition-colors focus-visible:border-[#006d33] focus-visible:ring-0 md:text-lg";

const labelClass =
  "text-xs font-bold tracking-widest text-[#474747] uppercase";

function parseDecimalInput(raw: string): number {
  return Number.parseFloat(raw.replace(/\s/g, "").replace(",", "."));
}

function isoToDateOnly(iso: string): string {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return format(new Date(), "yyyy-MM-dd");
  return format(d, "yyyy-MM-dd");
}

type FormState = {
  category: (typeof CATEGORIES)[number]["id"];
  amount: string;
  date: string;
  description: string;
  odometer: string;
  liters: string;
};

function emptyForm(): FormState {
  return {
    category: "fuel",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    odometer: "",
    liters: "",
  };
}

function formFromExpense(e: ExpenseFormExpense): FormState {
  return {
    category: e.category,
    amount: String(e.amount).replace(".", ","),
    date: isoToDateOnly(e.occurredAt),
    description: e.description ?? "",
    odometer:
      e.odometer !== null && e.odometer !== undefined
        ? String(e.odometer)
        : "",
    liters:
      e.liters !== null && e.liters !== undefined
        ? String(e.liters).replace(".", ",")
        : "",
  };
}

type ExpenseFormBodyProps = {
  expense?: ExpenseFormExpense | null;
  open: boolean;
  onClose: () => void;
  onLimitReached: () => void;
  onSaved?: () => void;
};

function ExpenseFormBody({
  expense,
  open,
  onClose,
  onLimitReached,
  onSaved,
}: ExpenseFormBodyProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);
  const [prevMaxOdometer, setPrevMaxOdometer] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(expense ? formFromExpense(expense) : emptyForm());
  }, [open, expense]);

  useEffect(() => {
    if (!open || form.category !== "fuel") {
      setPrevMaxOdometer(null);
      return;
    }
    let cancelled = false;
    const qs = expense?.id ? `?excludeId=${expense.id}` : "";
    void fetch(`/api/expenses/max-fuel-odometer${qs}`, {
      credentials: "include",
    })
      .then((r) => r.json() as Promise<{ data: { maxOdometer: number | null } | null }>)
      .then((json) => {
        if (cancelled) return;
        setPrevMaxOdometer(json.data?.maxOdometer ?? null);
      })
      .catch(() => {
        if (!cancelled) setPrevMaxOdometer(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, form.category, expense?.id]);

  const preview = useMemo(() => {
    if (form.category !== "fuel") {
      return {
        costPerLiter: null as number | null,
        costPerKmFill: null as number | null,
        kmDelta: null as number | null,
      };
    }
    const amount = parseDecimalInput(form.amount);
    const liters = parseDecimalInput(form.liters);
    const odometer = Number.parseInt(form.odometer, 10);
    const costPerLiter =
      amount > 0 && liters > 0 && !Number.isNaN(liters) ? amount / liters : null;
    let kmDelta: number | null = null;
    let costPerKmFill: number | null = null;
    if (
      amount > 0 &&
      !Number.isNaN(odometer) &&
      prevMaxOdometer !== null
    ) {
      kmDelta = odometer - prevMaxOdometer;
      if (kmDelta > 0) costPerKmFill = amount / kmDelta;
    }
    return { costPerLiter, costPerKmFill, kmDelta };
  }, [
    form.category,
    form.amount,
    form.liters,
    form.odometer,
    prevMaxOdometer,
  ]);

  const submit = async () => {
    const amount = parseDecimalInput(form.amount);
    if (!(amount > 0) || Number.isNaN(amount)) {
      toast.error("Informe um valor válido.");
      return;
    }
    let occurredAt: Date;
    try {
      occurredAt = startOfDay(
        parse(form.date, "yyyy-MM-dd", new Date()),
      );
      if (Number.isNaN(occurredAt.getTime())) {
        toast.error("Data inválida.");
        return;
      }
    } catch {
      toast.error("Data inválida.");
      return;
    }

    if (form.category === "fuel") {
      const odometer = Number.parseInt(form.odometer, 10);
      const liters = parseDecimalInput(form.liters);
      if (Number.isNaN(odometer) || odometer < 0) {
        toast.error("Informe o km do odômetro.");
        return;
      }
      if (!(liters > 0) || Number.isNaN(liters)) {
        toast.error("Informe os litros abastecidos.");
        return;
      }
    }

    setPending(true);
    try {
      const descTrim = form.description.trim();
      const baseBody = {
        category: form.category,
        amount,
        occurredAt: occurredAt.toISOString(),
        description: descTrim.length > 0 ? descTrim : null,
        odometer:
          form.category === "fuel"
            ? Number.parseInt(form.odometer, 10)
            : null,
        liters:
          form.category === "fuel"
            ? parseDecimalInput(form.liters)
            : null,
      };

      const url = expense
        ? `/api/expenses/${expense.id}`
        : "/api/expenses";
      const res = await fetch(url, {
        method: expense ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseBody),
      });
      const json = (await res.json()) as {
        error: { code?: string; message?: string } | null;
      };

      if (!res.ok || json.error) {
        if (json.error?.code === "LIMIT_REACHED") {
          onLimitReached();
          return;
        }
        toast.error(json.error?.message ?? "Não foi possível salvar.");
        return;
      }

      toast.success(expense ? "Gasto atualizado." : "Gasto registrado.");
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
          <Label className={labelClass}>Categoria</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIES.map(({ id, label, short, icon: Icon, onClass, offClass }) => {
              const on = form.category === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: id }))}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all duration-150",
                    on ? onClass : offClass,
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
            <Label htmlFor="expense-amount" className={labelClass}>
              Valor
            </Label>
            <div className="relative">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-[#474747]">
                R$
              </span>
              <Input
                id="expense-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                className={cn(fieldClass, "pl-11")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-date" className={labelClass}>
              Data
            </Label>
            <Input
              id="expense-date"
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((f) => ({ ...f, date: e.target.value }))
              }
              className={cn(fieldClass, "text-sm font-medium")}
            />
          </div>
        </div>

        {form.category === "fuel" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-liters" className={labelClass}>
                Litros
              </Label>
              <div className="relative">
                <Input
                  id="expense-liters"
                  inputMode="decimal"
                  placeholder="0,0"
                  value={form.liters}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, liters: e.target.value }))
                  }
                  className={cn(fieldClass, "pr-14")}
                />
                <span className="absolute top-1/2 right-4 -translate-y-1/2 font-bold text-[#474747]">
                  L
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-odo" className={labelClass}>
                Km do odômetro
              </Label>
              <div className="relative">
                <Input
                  id="expense-odo"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.odometer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, odometer: e.target.value }))
                  }
                  className={cn(fieldClass, "pr-14")}
                />
                <span className="absolute top-1/2 right-4 -translate-y-1/2 font-bold text-[#474747]">
                  km
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="expense-desc" className={labelClass}>
            Descrição (opcional)
          </Label>
          <textarea
            id="expense-desc"
            rows={3}
            placeholder="Ex.: posto BR, troca de pastilhas…"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className={cn(
              fieldClass,
              "min-h-[88px] resize-none text-sm font-medium",
            )}
          />
        </div>

        {form.category === "fuel" ? (
          <div className="space-y-4 rounded-2xl bg-black p-6 text-white">
            <div className="flex items-center justify-between opacity-90">
              <span className="text-sm font-medium">Custo por litro</span>
              <span className="font-bold">
                {preview.costPerLiter === null
                  ? "—"
                  : money.format(preview.costPerLiter)}
              </span>
            </div>
            <div className="h-px w-full bg-white/10" />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold tracking-widest text-[#5adf82] uppercase">
                  Custo/km (este abastecimento)
                </span>
                <div className="text-2xl font-black text-[#5adf82]">
                  {preview.costPerKmFill === null
                    ? "—"
                    : money.format(preview.costPerKmFill)}
                </div>
                <p className="text-[10px] text-white/60">
                  {prevMaxOdometer === null
                    ? "Sem abastecimento anterior com odômetro para comparar."
                    : preview.kmDelta !== null && preview.kmDelta <= 0
                      ? `Odômetro deve ser maior que o último registro (${prevMaxOdometer.toLocaleString("pt-BR")} km).`
                      : `Km desde o último abastecimento: ${preview.kmDelta?.toLocaleString("pt-BR") ?? "—"}`}
                </p>
              </div>
            </div>
          </div>
        ) : null}
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
          onClick={() => void submit()}
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
              {expense ? "Salvar alterações" : "Salvar gasto"}
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

export function ExpenseFormDrawer({
  expense,
  children,
  open: openProp,
  onOpenChange,
  onSaved,
}: ExpenseFormDrawerProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [internalOpen, setInternalOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  const title = expense ? "Editar gasto" : "Novo gasto";

  const sharedForm = (
    <ExpenseFormBody
      expense={expense ?? null}
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
            Você atingiu o limite de 20 gastos deste mês. Faça upgrade para
            registrar gastos ilimitados.
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
