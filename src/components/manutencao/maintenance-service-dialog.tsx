"use client";

import { format, parse, startOfDay } from "date-fns";
import { Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { MaintenanceItemDto } from "@/lib/maintenance-serialize";
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

const fieldClass =
  "h-11 rounded-lg border border-border bg-[#f3f3f3] px-3 text-sm font-semibold shadow-none focus-visible:ring-1 focus-visible:ring-black";

type MaintenanceServiceDialogProps = {
  item: MaintenanceItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKm: number | null;
  onSaved: () => void;
};

export function MaintenanceServiceDialog({
  item,
  open,
  onOpenChange,
  defaultKm,
  onSaved,
}: MaintenanceServiceDialogProps) {
  const [km, setKm] = useState("");
  const [dateStr, setDateStr] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setKm(
      defaultKm !== null && defaultKm > 0
        ? String(defaultKm)
        : String(item.lastServiceKm),
    );
    setDateStr(format(new Date(), "yyyy-MM-dd"));
  }, [open, item, defaultKm]);

  async function submit() {
    if (!item) return;
    const k = Number.parseInt(km, 10);
    if (Number.isNaN(k) || k < 0) {
      toast.error("Informe o km do serviço.");
      return;
    }
    let at: Date;
    try {
      at = startOfDay(parse(dateStr, "yyyy-MM-dd", new Date()));
      if (Number.isNaN(at.getTime())) {
        toast.error("Data inválida.");
        return;
      }
    } catch {
      toast.error("Data inválida.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/maintenance/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastServiceKm: k,
          lastServiceAt: at.toISOString(),
        }),
      });
      const json = (await res.json()) as {
        error: { message?: string } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Serviço registrado.");
      onOpenChange(false);
      onSaved();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Wrench className="size-5" />
            Registrar serviço
          </DialogTitle>
          {item ? (
            <p className="text-sm text-muted-foreground">{item.type}</p>
          ) : null}
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="svc-km">Km no serviço</Label>
            <Input
              id="svc-km"
              inputMode="numeric"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className={cn(fieldClass)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-date">Data do serviço</Label>
            <Input
              id="svc-date"
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className={cn(fieldClass)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-stretch">
          <Button
            type="button"
            className="bg-black font-bold"
            disabled={pending || !item}
            onClick={() => void submit()}
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
