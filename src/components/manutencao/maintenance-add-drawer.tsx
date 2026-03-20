"use client";

import { format, parse, startOfDay } from "date-fns";
import { Save } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  "Troca de Óleo",
  "Pneus",
  "Freios",
  "Revisão",
  "Filtro de Ar",
] as const;

const OTHER = "__outros__";

const fieldClass =
  "h-11 rounded-lg border border-border bg-[#f3f3f3] px-3 text-sm font-semibold shadow-none focus-visible:ring-1 focus-visible:ring-black";

type MaintenanceAddDrawerProps = {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved: () => void;
};

function AddFormBody({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [typeKey, setTypeKey] = useState<string>(TYPE_OPTIONS[0]);
  const [otherLabel, setOtherLabel] = useState("");
  const [lastKm, setLastKm] = useState("");
  const [dateStr, setDateStr] = useState(format(new Date(), "yyyy-MM-dd"));
  const [intervalKm, setIntervalKm] = useState("");
  const [estimated, setEstimated] = useState("");
  const [pending, setPending] = useState(false);

  const resolvedType =
    typeKey === OTHER ? otherLabel.trim() : typeKey;

  const submit = async () => {
    if (!resolvedType) {
      toast.error("Informe o tipo de manutenção.");
      return;
    }
    const lkm = Number.parseInt(lastKm, 10);
    if (Number.isNaN(lkm) || lkm < 0) {
      toast.error("Km do último serviço inválido.");
      return;
    }
    const inter = Number.parseInt(intervalKm, 10);
    if (Number.isNaN(inter) || inter < 1) {
      toast.error("Intervalo em km inválido.");
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

    let est: number | null = null;
    const estRaw = estimated.replace(/\s/g, "").replace(",", ".").trim();
    if (estRaw.length > 0) {
      const n = Number.parseFloat(estRaw);
      if (Number.isNaN(n) || n <= 0) {
        toast.error("Custo estimado inválido.");
        return;
      }
      est = n;
    }

    setPending(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: resolvedType,
          lastServiceKm: lkm,
          lastServiceAt: at.toISOString(),
          intervalKm: inter,
          estimatedCost: est,
        }),
      });
      const json = (await res.json()) as {
        error: { message?: string } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Manutenção adicionada.");
      setTypeKey(TYPE_OPTIONS[0]);
      setOtherLabel("");
      setLastKm("");
      setIntervalKm("");
      setEstimated("");
      setDateStr(format(new Date(), "yyyy-MM-dd"));
      onClose();
      onSaved();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={typeKey} onValueChange={setTypeKey}>
            <SelectTrigger className={cn(fieldClass, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
              <SelectItem value={OTHER}>Outros</SelectItem>
            </SelectContent>
          </Select>
          {typeKey === OTHER ? (
            <Input
              placeholder="Descreva o serviço"
              value={otherLabel}
              onChange={(e) => setOtherLabel(e.target.value)}
              className={cn(fieldClass)}
            />
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="m-last-km">Último serviço (km)</Label>
            <Input
              id="m-last-km"
              inputMode="numeric"
              value={lastKm}
              onChange={(e) => setLastKm(e.target.value)}
              className={cn(fieldClass)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-date">Data do serviço</Label>
            <Input
              id="m-date"
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className={cn(fieldClass)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="m-interval">Intervalo (km)</Label>
            <Input
              id="m-interval"
              inputMode="numeric"
              placeholder="Ex.: 5000"
              value={intervalKm}
              onChange={(e) => setIntervalKm(e.target.value)}
              className={cn(fieldClass)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-est">Custo estimado (R$)</Label>
            <Input
              id="m-est"
              inputMode="decimal"
              placeholder="Opcional"
              value={estimated}
              onChange={(e) => setEstimated(e.target.value)}
              className={cn(fieldClass)}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 shrink-0 space-y-2 border-t border-border pt-4">
        <Button
          type="button"
          disabled={pending}
          className="h-12 w-full gap-2 bg-black font-bold"
          onClick={() => void submit()}
        >
          <Save className="size-4" />
          Salvar
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full font-semibold"
          onClick={onClose}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function MaintenanceAddDrawer({
  children,
  open: openProp,
  onOpenChange,
  onSaved,
}: MaintenanceAddDrawerProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const body = (
    <AddFormBody onClose={() => setOpen(false)} onSaved={onSaved} />
  );

  if (isMobile) {
    return (
      <Drawer
        direction="bottom"
        open={open}
        onOpenChange={setOpen}
        repositionInputs={false}
      >
        {children ? <DrawerTrigger asChild>{children}</DrawerTrigger> : null}
        <DrawerContent className="max-h-[90vh] rounded-t-[2rem] border-t bg-white px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted" />
          <DrawerHeader className="px-0 pt-4 pb-2 text-left">
            <DrawerTitle className="text-xl font-bold">
              Nova manutenção
            </DrawerTitle>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Nova manutenção
          </DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
