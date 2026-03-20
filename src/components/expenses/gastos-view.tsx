"use client";

import { endOfDay, format, parse, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Plus, Trash2, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ExpenseFormDrawer,
  type ExpenseFormExpense,
} from "@/components/expenses/expense-form-drawer";
import { ExpensesFilters } from "@/components/expenses/expenses-filters";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type ApiExpense = {
  id: string;
  category: "fuel" | "maintenance" | "insurance" | "fine" | "other";
  amount: number;
  odometer: number | null;
  liters: number | null;
  description: string | null;
  occurredAt: string;
};

type ListPayload = {
  expenses: ApiExpense[];
  total: number;
  page: number;
  totalPages: number;
  summary: {
    totalAmount: number;
    topCategory: {
      category: ApiExpense["category"];
      label: string;
      amount: number;
      percentOfTotal: number;
    } | null;
    costPerKm: number | null;
  };
};

function buildExpensesApiQuery(sp: URLSearchParams): string {
  const params = new URLSearchParams();
  const from = sp.get("from");
  const to = sp.get("to");
  if (from && to) {
    const fromD = startOfDay(parse(from, "yyyy-MM-dd", new Date()));
    const toD = endOfDay(parse(to, "yyyy-MM-dd", new Date()));
    params.set("startDate", fromD.toISOString());
    params.set("endDate", toD.toISOString());
  }
  const category = sp.get("category");
  if (category) params.set("category", category);
  params.set("sort", sp.get("sort") ?? "recent");
  params.set("page", sp.get("page") ?? "1");
  params.set("limit", "20");
  return params.toString();
}

function categoryLabel(c: ApiExpense["category"]): string {
  switch (c) {
    case "fuel":
      return "Combustível";
    case "maintenance":
      return "Manutenção";
    case "insurance":
      return "Seguro";
    case "fine":
      return "Multa";
    case "other":
      return "Outros";
    default:
      return c;
  }
}

function categoryBadgeClass(c: ApiExpense["category"]): string {
  switch (c) {
    case "fuel":
      return "bg-orange-100 text-orange-950";
    case "maintenance":
      return "bg-blue-100 text-blue-950";
    case "insurance":
      return "bg-violet-100 text-violet-950";
    case "fine":
      return "bg-red-100 text-red-950";
    case "other":
      return "bg-neutral-200 text-neutral-900";
    default:
      return "bg-neutral-500 text-white";
  }
}

function expenseToFormExpense(e: ApiExpense): ExpenseFormExpense {
  return {
    id: e.id,
    category: e.category,
    amount: e.amount,
    odometer: e.odometer,
    liters: e.liters,
    description: e.description,
    occurredAt: e.occurredAt,
  };
}

export type GastosViewProps = {
  showFreeLimitBanner: boolean;
};

export function GastosView({ showFreeLimitBanner }: GastosViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const queryKey = useMemo(
    () => buildExpensesApiQuery(new URLSearchParams(searchKey)),
    [searchKey],
  );

  const pageFromUrl = Math.max(
    1,
    Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
  );

  const [payload, setPayload] = useState<ListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<ExpenseFormExpense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(
    async (mode: "full" | "silent") => {
      if (mode === "full") {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(`/api/expenses?${queryKey}`, {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data: ListPayload | null;
          error: { message: string } | null;
        };
        if (!res.ok || json.error || !json.data) {
          if (mode === "full") {
            setError(
              json.error?.message ?? "Não foi possível carregar os gastos.",
            );
            setPayload(null);
          }
          return;
        }
        setPayload(json.data);
      } catch {
        if (mode === "full") {
          setError("Não foi possível carregar os gastos.");
          setPayload(null);
        }
      } finally {
        if (mode === "full") setLoading(false);
      }
    },
    [queryKey],
  );

  useEffect(() => {
    void fetchList("full");
  }, [fetchList]);

  useEffect(() => {
    if (!payload || payload.total === 0) return;
    if (
      payload.totalPages > 0 &&
      pageFromUrl > payload.totalPages
    ) {
      const next = new URLSearchParams(searchParams.toString());
      next.set("page", "1");
      router.replace(`/gastos?${next.toString()}`);
    }
  }, [payload, pageFromUrl, router, searchParams]);

  function setPage(p: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    router.replace(`/gastos?${next.toString()}`);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as {
        error: { message: string } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Não foi possível excluir.");
        return;
      }
      toast.success("Gasto excluído.");
      setDeleteId(null);
      await fetchList("silent");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const limit = 20;
  const total = payload?.total ?? 0;
  const page = payload?.page ?? pageFromUrl;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  const top = payload?.summary.topCategory;

  return (
    <div className="relative mx-auto max-w-7xl">
      {showFreeLimitBanner ? (
        <div className="mb-4 flex flex-col gap-3 rounded-none border-b border-yellow-500/30 bg-yellow-400 px-4 py-3 text-black sm:flex-row sm:items-center sm:justify-between md:rounded-lg md:border">
          <div className="flex items-start gap-3 sm:items-center">
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0 sm:mt-0"
              aria-hidden
            />
            <p className="text-sm font-bold tracking-tight">
              Você atingiu o limite de 20 gastos do plano gratuito neste mês.
              Faça upgrade para registrar gastos ilimitados.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 bg-black font-bold uppercase tracking-wider text-white hover:bg-black/90"
          >
            <Link href="/planos">Ver planos</Link>
          </Button>
        </div>
      ) : null}

      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
        <Button
          type="button"
          className="h-11 gap-2 bg-black font-bold tracking-tight text-white hover:bg-black/90"
          onClick={() => {
            setEditingExpense(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-5" strokeWidth={2} />
          Novo gasto
        </Button>
      </header>

      <ExpensesFilters />

      <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-[0_4px_20px_0_rgba(0,0,0,0.02)]">
          <p className="mb-2 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Total gasto
          </p>
          {loading && !payload ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            <p className="text-4xl font-bold tracking-tighter tabular-nums">
              {brl.format(payload?.summary.totalAmount ?? 0)}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-[0_4px_20px_0_rgba(0,0,0,0.02)]">
          <p className="mb-2 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Maior categoria
          </p>
          {loading && !payload ? (
            <Skeleton className="h-10 w-48" />
          ) : top ? (
            <>
              <p className="text-lg font-bold tracking-tight">{top.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {brl.format(top.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {top.percentOfTotal.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}
                % do total no período
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sem gastos no período.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-black bg-black p-6 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <p className="mb-2 text-xs font-medium tracking-widest text-neutral-400 uppercase">
            Custo/km (combustível ÷ km corridas)
          </p>
          {loading && !payload ? (
            <Skeleton className="h-10 w-40 bg-white/20" />
          ) : payload != null && payload.summary.costPerKm != null ? (
            <p className="text-4xl font-bold tracking-tighter tabular-nums text-[#5adf82]">
              {brl.format(payload.summary.costPerKm)}
            </p>
          ) : (
            <p className="text-lg font-semibold text-white/80">
              Registre abastecimento e corridas no período para estimar.
            </p>
          )}
        </div>
      </section>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!loading && total === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/40 px-6 py-16 text-center">
          <div className="relative mb-8 flex size-36 items-center justify-center rounded-full bg-muted">
            <Wallet className="size-16 text-muted-foreground" strokeWidth={1.25} />
            <div className="absolute -right-1 -bottom-1 flex size-11 items-center justify-center rounded-xl bg-[#006d33] text-white shadow-lg">
              <Plus className="size-5" strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight">
            Nenhum gasto registrado
          </h2>
          <p className="mb-8 max-w-sm text-muted-foreground">
            Registre abastecimentos e despesas do carro para ver custo por km e
            totais.
          </p>
          <Button
            type="button"
            className="h-12 gap-2 bg-black px-8 font-bold tracking-wide text-white uppercase hover:bg-black/90"
            onClick={() => {
              setEditingExpense(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Registrar gasto
          </Button>
        </section>
      ) : null}

      {total > 0 || (loading && !payload) ? (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-4 py-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:px-6">
                    Data
                  </TableHead>
                  <TableHead className="px-4 py-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:px-6">
                    Categoria
                  </TableHead>
                  <TableHead className="px-4 py-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:px-6">
                    Descrição
                  </TableHead>
                  <TableHead className="px-4 py-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:px-6">
                    Valor
                  </TableHead>
                  <TableHead className="w-[100px] px-4 py-4 sm:px-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !payload
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j} className="px-6 py-4">
                            <Skeleton className="h-5 w-full max-w-[120px]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (payload?.expenses ?? []).map((row) => {
                      const when = parseISO(row.occurredAt);
                      const desc =
                        row.description?.trim() ||
                        (row.category === "fuel" && row.liters
                          ? `${row.liters.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`
                          : "—");
                      return (
                        <TableRow
                          key={row.id}
                          className="group border-b border-border/40 hover:bg-muted/30"
                        >
                          <TableCell className="px-4 py-4 sm:px-6">
                            <span className="text-sm font-bold">
                              {format(when, "d MMM yyyy", { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-4 sm:px-6">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-3 py-1 text-[10px] font-bold tracking-tight uppercase",
                                categoryBadgeClass(row.category),
                              )}
                            >
                              {categoryLabel(row.category)}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate px-4 py-4 text-sm text-muted-foreground sm:max-w-xs sm:px-6">
                            {desc}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-sm font-bold sm:px-6">
                            {brl.format(row.amount)}
                          </TableCell>
                          <TableCell className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-end gap-2 sm:opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Editar gasto"
                                onClick={() => {
                                  setEditingExpense(expenseToFormExpense(row));
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive/70 hover:text-destructive"
                                aria-label="Excluir gasto"
                                onClick={() => setDeleteId(row.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {total > 0 ? (
        <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            Mostrando {rangeStart}–{rangeEnd} de {total} gastos
          </p>
          <div className="flex justify-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="font-semibold"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              ← Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              className="font-semibold"
              disabled={
                loading ||
                !payload ||
                payload.totalPages === 0 ||
                page >= payload.totalPages
              }
              onClick={() => setPage(page + 1)}
            >
              Próxima →
            </Button>
          </div>
        </div>
      ) : null}

      <ExpenseFormDrawer
        expense={editingExpense ?? undefined}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingExpense(null);
        }}
        onSaved={() => void fetchList("silent")}
      />

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro será removido do seu
              histórico.
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
