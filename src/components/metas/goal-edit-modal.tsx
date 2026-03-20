"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MIN = 500;
const MAX = 50_000;
const STEP = 50;

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export type GoalEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Meta atual do mês (edição) ou null (nova). */
  initialTarget: number | null;
  year: number;
  month: number;
  weekdaysInMonth: number;
  ridesThisMonth: number;
  onSaved: () => void;
};

export function GoalEditModal({
  open,
  onOpenChange,
  initialTarget,
  year,
  month,
  weekdaysInMonth,
  ridesThisMonth,
  onSaved,
}: GoalEditModalProps) {
  const [value, setValue] = useState(
    initialTarget ?? 3000,
  );

  useEffect(() => {
    if (!open) return;
    setValue(
      Math.min(
        MAX,
        Math.max(MIN, initialTarget ?? 3000),
      ),
    );
  }, [open, initialTarget]);

  const previewDaily =
    weekdaysInMonth > 0 ? value / weekdaysInMonth : null;
  const previewRide =
    ridesThisMonth > 0 ? value / ridesThisMonth : null;

  async function save() {
    if (value < MIN || value > MAX) {
      toast.error(`Valor entre ${brl.format(MIN)} e ${brl.format(MAX)}.`);
      return;
    }
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyTarget: value,
          month,
          year,
        }),
      });
      const json = (await res.json()) as {
        data: unknown;
        error: { message?: string } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Meta salva.");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {initialTarget !== null ? "Ajustar meta" : "Definir meta mensal"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-2">
              <Label htmlFor="goal-val">Valor da meta</Label>
              <span className="text-2xl font-black tabular-nums">
                {brl.format(value)}
              </span>
            </div>
            <input
              id="goal-slider"
              type="range"
              min={MIN}
              max={MAX}
              step={STEP}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="h-3 w-full cursor-pointer accent-black"
            />
            <Input
              id="goal-val"
              inputMode="numeric"
              value={String(value)}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                if (raw === "") return;
                const n = Number.parseInt(raw, 10);
                if (!Number.isNaN(n))
                  setValue(Math.min(MAX, Math.max(MIN, n)));
              }}
              className="font-bold"
            />
          </div>
          <div className="rounded-xl bg-[#f3f3f3] p-4 text-sm">
            <p className="mb-2 text-[10px] font-bold tracking-widest text-[#777777] uppercase">
              Preview
            </p>
            <p className="font-semibold">
              Meta diária (média nos {weekdaysInMonth} dias úteis do mês):{" "}
              <span className="text-[#006d33]">
                {previewDaily !== null ? brl.format(previewDaily) : "—"}
              </span>
            </p>
            <p className="mt-2 font-semibold">
              Por corrida (se {ridesThisMonth || "N"} corridas neste mês):{" "}
              <span className="text-black">
                {previewRide !== null ? brl.format(previewRide) : "—"}
              </span>
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-stretch">
          <Button
            type="button"
            className={cn("bg-black font-bold")}
            onClick={() => void save()}
          >
            Salvar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
