"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Wrench } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MaintenanceAddDrawer } from "@/components/manutencao/maintenance-add-drawer";
import { MaintenanceServiceDialog } from "@/components/manutencao/maintenance-service-dialog";
import { useMaintenanceAlertsRefetch } from "@/components/layout/maintenance-alerts-context";
import { MaintenancePushPanel } from "@/components/push/maintenance-push-panel";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { MaintenanceItemDto } from "@/lib/maintenance-serialize";
import { cn } from "@/lib/utils";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type ApiPayload = {
  items: MaintenanceItemDto[];
  currentOdometer: number | null;
  provisionPerKm: number;
};

function kmFmt(n: number) {
  return `${n.toLocaleString("pt-BR")} km`;
}

function statusBadge(status: MaintenanceItemDto["status"]) {
  switch (status) {
    case "overdue":
      return {
        label: "Atrasado",
        className: "bg-red-500/10 text-red-700",
      };
    case "warning":
      return {
        label: "Próximo",
        className: "bg-amber-500/15 text-amber-900",
      };
    default:
      return {
        label: "Em dia",
        className: "bg-[#00a651]/10 text-[#006d33]",
      };
  }
}

function kmMessage(item: MaintenanceItemDto): string {
  if (item.kmUntilDue === null) return "Cadastre o odômetro do veículo";
  if (item.kmUntilDue > 0)
    return `Faltam ${item.kmUntilDue.toLocaleString("pt-BR")} km`;
  const over = Math.abs(item.kmUntilDue);
  return `${over.toLocaleString("pt-BR")} km além do previsto`;
}

export function ManutencaoView() {
  const refetchNavAlerts = useMaintenanceAlertsRefetch();
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceItem, setServiceItem] = useState<MaintenanceItemDto | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/maintenance", { credentials: "include" });
      const json = (await res.json()) as {
        data: ApiPayload | null;
        error: { message?: string } | null;
      };
      if (!res.ok || json.error || !json.data) {
        setError(json.error?.message ?? "Não foi possível carregar.");
        setData(null);
        return;
      }
      setData(json.data);
    } catch {
      setError("Não foi possível carregar.");
      setData(null);
    } finally {
      setLoading(false);
    }
    void refetchNavAlerts();
  }, [refetchNavAlerts]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const overdueItems = useMemo(
    () => items.filter((i) => i.status === "overdue"),
    [items],
  );
  const warningItems = useMemo(
    () => items.filter((i) => i.status === "warning"),
    [items],
  );
  const alertItems = useMemo(
    () => items.filter((i) => i.status === "warning" || i.status === "overdue"),
    [items],
  );

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/maintenance/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Não foi possível excluir.");
        return;
      }
      toast.success("Item removido.");
      setDeleteId(null);
      await fetchData();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-6 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Manutenção
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alertas por km, provisão sugerida e registro de serviços.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MaintenanceAddDrawer
            open={addOpen}
            onOpenChange={setAddOpen}
            onSaved={() => void fetchData()}
          >
            <Button
              type="button"
              className="h-11 gap-2 bg-black font-bold text-white hover:bg-black/90"
            >
              + Adicionar manutenção
            </Button>
          </MaintenanceAddDrawer>
        </div>
      </header>

      {data?.currentOdometer === null ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p>
            Defina o <strong>odômetro atual</strong> do veículo para calcular
            alertas (“Faltam X km”) e para que os{" "}
            <strong>avisos no navegador</strong> saibam quando notificar.
          </p>
          <Button
            asChild
            className="mt-4 h-10 bg-black font-bold text-white hover:bg-black/90"
          >
            <Link href="/configuracoes/veiculo">Ir para odômetro do veículo</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              Notificações no navegador
            </span>{" "}
            usam o odômetro cadastrado em Veículo. Atualize após revisões ou
            viagens longas para os lembretes continuarem corretos.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-3 h-9 border-black/20 font-bold"
          >
            <Link href="/configuracoes/veiculo">Atualizar odômetro</Link>
          </Button>
        </div>
      )}

      <MaintenancePushPanel />

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : null}

      {!loading && data && alertItems.length > 0 ? (
        <section className="space-y-4">
          {overdueItems.length > 0 ? (
            <div className="rounded-xl border-l-4 border-red-500 bg-red-50 px-4 py-4 text-red-950">
              <p className="text-sm font-bold uppercase tracking-wide">
                Atrasadas
              </p>
              <p className="text-2xl font-extrabold">
                {overdueItems.length}{" "}
                {overdueItems.length === 1
                  ? "manutenção atrasada"
                  : "manutenções atrasadas"}
              </p>
            </div>
          ) : null}
          {warningItems.length > 0 ? (
            <div className="rounded-xl border-l-4 border-amber-500 bg-amber-100 px-4 py-4 text-amber-950">
              <p className="text-sm font-bold uppercase tracking-wide">
                Próximas
              </p>
              <p className="text-2xl font-extrabold">
                {warningItems.length}{" "}
                {warningItems.length === 1
                  ? "manutenção próxima"
                  : "manutenções próximas"}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {alertItems.map((item) => {
              const pct = item.progressPercent ?? 0;
              return (
                <div
                  key={`alert-${item.id}`}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#eeeeee]">
                      <Wrench className="size-6 text-black" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{item.type}</h3>
                      <p className="text-sm text-muted-foreground">
                        {kmMessage(item)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:max-w-[200px]">
                    <div className="mb-1 flex justify-between text-[10px] font-bold tracking-tight uppercase">
                      <span>Progresso</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress
                      value={Math.min(100, pct)}
                      className={cn(
                        "h-2 bg-muted",
                        item.status === "overdue" && "[&_[data-slot=progress-indicator]]:bg-red-600",
                        item.status === "warning" &&
                          "[&_[data-slot=progress-indicator]]:bg-[#006d33]",
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {data ? (
        <section className="relative overflow-hidden rounded-2xl bg-black p-8 text-white">
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold">Provisão sugerida</h2>
              <p className="mt-1 max-w-md text-sm text-white/70">
                Reserve um valor por km rodado para cobrir manutenções futuras
                (soma dos custos estimados ÷ intervalos).
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">
                Reserve por km
              </p>
              <p className="text-4xl font-extrabold tracking-tight text-[#5adf82]">
                {brl.format(data.provisionPerKm)}
              </p>
            </div>
          </div>
          <div
            className="pointer-events-none absolute -right-10 -bottom-10 size-64 rounded-full bg-[#00a651] opacity-20 blur-3xl"
            aria-hidden
          />
        </section>
      ) : null}

      <section>
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Itens cadastrados
        </h2>
        {!loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/30 py-16 text-center">
            <Wrench className="mb-4 size-14 text-muted-foreground" />
            <p className="mb-6 max-w-sm text-muted-foreground">
              Nenhum item ainda. Adicione trocas de óleo, pneus e revisões para
              receber alertas.
            </p>
            <Button
              type="button"
              className="bg-black font-bold"
              onClick={() => setAddOpen(true)}
            >
              + Adicionar manutenção
            </Button>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((item) => {
              const badge = statusBadge(item.status);
              const lastAt = format(parseISO(item.lastServiceAt), "d MMM yyyy", {
                locale: ptBR,
              });
              return (
                <div
                  key={item.id}
                  className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                        Tipo
                      </p>
                      <h3 className="text-xl font-bold">{item.type}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase",
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive/70 hover:text-destructive"
                        aria-label="Excluir item"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Último serviço
                      </p>
                      <p className="text-sm font-bold">
                        {kmFmt(item.lastServiceKm)} · {lastAt}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Próximo
                      </p>
                      <p className="text-sm font-bold">
                        {kmFmt(item.nextServiceKm)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-lg font-bold">
                      {item.estimatedCost !== null
                        ? brl.format(item.estimatedCost)
                        : "—"}{" "}
                      <small className="text-[10px] font-normal text-muted-foreground not-italic">
                        est.
                      </small>
                    </span>
                    <Button
                      type="button"
                      variant={item.status === "overdue" ? "default" : "secondary"}
                      className={cn(
                        "font-bold",
                        item.status === "overdue" && "bg-black text-white",
                      )}
                      onClick={() => setServiceItem(item)}
                    >
                      Registrar serviço
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <MaintenanceServiceDialog
        item={serviceItem}
        open={serviceItem !== null}
        onOpenChange={(o) => {
          if (!o) setServiceItem(null);
        }}
        defaultKm={data?.currentOdometer ?? null}
        onSaved={() => void fetchData()}
      />

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              O alerta e a provisão serão recalculados sem este item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
