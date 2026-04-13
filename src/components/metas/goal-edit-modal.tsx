"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  const clampTarget = (n: number) =>
    Math.min(MAX, Math.max(MIN, n));

  const [value, setValue] = useState(() =>
    clampTarget(initialTarget ?? 3000),
  );
  /** Texto do campo numérico: separado do valor para permitir digitar/apagar sem travar no mínimo. */
  const [inputText, setInputText] = useState(() =>
    String(clampTarget(initialTarget ?? 3000)),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const v = clampTarget(initialTarget ?? 3000);
    setValue(v);
    setInputText(String(v));
  }, [open, initialTarget]);

  /** Número usado nas prévias: digitação em andamento ou valor confirmado. */
  function previewTarget(): number {
    const raw = inputText.replace(/\D/g, "");
    if (raw === "") return value;
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return value;
    return Math.min(MAX, Math.max(0, n));
  }

  const pt = previewTarget();
  const previewDaily =
    weekdaysInMonth > 0 ? pt / weekdaysInMonth : null;
  const previewRide =
    ridesThisMonth > 0 ? pt / ridesThisMonth : null;

  function commitFromInput(): number {
    const raw = inputText.replace(/\D/g, "");
    if (raw === "") return clampTarget(MIN);
    const n = Number.parseInt(raw, 10);
    return clampTarget(Number.isNaN(n) ? MIN : n);
  }

  async function save() {
    const committed = commitFromInput();
    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyTarget: committed,
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 text-left">
          <DialogTitle className="text-xl font-bold">
            {initialTarget !== null ? "Ajustar meta" : "Definir meta mensal"}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-2">
                <Label htmlFor="goal-val">Valor da meta</Label>
                <span className="text-2xl font-black tabular-nums">
                  {brl.format(pt)}
                </span>
              </div>
              <input
                id="goal-slider"
                type="range"
                min={MIN}
                max={MAX}
                step={STEP}
                value={value}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setValue(v);
                  setInputText(String(v));
                }}
                className="h-3 w-full cursor-pointer accent-black"
              />
              <Input
                id="goal-val"
                inputMode="numeric"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value.replace(/\D/g, ""));
                }}
                onBlur={() => {
                  if (inputText.trim() === "") {
                    const v = clampTarget(MIN);
                    setValue(v);
                    setInputText(String(v));
                    return;
                  }
                  const n = Number.parseInt(inputText, 10);
                  const v = clampTarget(Number.isNaN(n) ? MIN : n);
                  setValue(v);
                  setInputText(String(v));
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
        </div>
        <div
          className="shrink-0 border-t border-border bg-background px-6 pt-3"
          style={{
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-stretch">
            <Button
              type="button"
              className={cn("h-12 flex-1 bg-black text-base font-bold")}
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Salvando...
                </span>
              ) : (
                "Salvar"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 text-base"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
