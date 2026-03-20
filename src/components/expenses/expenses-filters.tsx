"use client";

import { Calendar, ListFilter, Tag } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultRideListDateRange,
  isDefaultRideListRange,
} from "@/lib/corridas-default-range";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigas" },
  { value: "amount_desc", label: "Maior valor" },
  { value: "amount_asc", label: "Menor valor" },
] as const;

type ExpensesFiltersProps = {
  className?: string;
};

export function ExpensesFilters({ className }: ExpensesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "recent";

  const hasActiveFilters = useMemo(() => {
    if (category) return true;
    if (sort !== "recent") return true;
    if (from && to && !isDefaultRideListRange(from, to)) return true;
    return false;
  }, [from, to, category, sort]);

  function pushParams(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    router.replace(`/gastos?${next.toString()}`);
  }

  return (
    <section
      className={cn(
        "mb-8 flex flex-col gap-3 rounded-xl bg-[#f3f3f3] p-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1 sm:min-w-[160px]">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Label htmlFor="expenses-filter-from" className="sr-only">
          Data inicial
        </Label>
        <Input
          id="expenses-filter-from"
          type="date"
          value={from}
          onChange={(e) => {
            pushParams((next) => {
              next.set("from", e.target.value);
              next.delete("page");
            });
          }}
          className="h-11 w-full border-0 bg-white pr-3 pl-10 shadow-none"
        />
      </div>
      <div className="relative min-w-0 flex-1 sm:min-w-[160px]">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Label htmlFor="expenses-filter-to" className="sr-only">
          Data final
        </Label>
        <Input
          id="expenses-filter-to"
          type="date"
          value={to}
          onChange={(e) => {
            pushParams((next) => {
              next.set("to", e.target.value);
              next.delete("page");
            });
          }}
          className="h-11 w-full border-0 bg-white pr-3 pl-10 shadow-none"
        />
      </div>
      <div className="relative min-w-0 flex-1 sm:min-w-[150px]">
        <Tag className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <Select
          value={category || "all"}
          onValueChange={(v) => {
            pushParams((next) => {
              if (v === "all") next.delete("category");
              else next.set("category", v);
              next.delete("page");
            });
          }}
        >
          <SelectTrigger className="h-11 w-full border-0 bg-white pl-10 shadow-none">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="fuel">Combustível</SelectItem>
            <SelectItem value="maintenance">Manutenção</SelectItem>
            <SelectItem value="insurance">Seguro</SelectItem>
            <SelectItem value="fine">Multa</SelectItem>
            <SelectItem value="other">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="relative min-w-0 flex-1 sm:min-w-[150px]">
        <ListFilter className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <Select
          value={sort}
          onValueChange={(v) => {
            pushParams((next) => {
              next.set("sort", v);
              next.delete("page");
            });
          }}
        >
          <SelectTrigger className="h-11 w-full border-0 bg-white pl-10 shadow-none">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters ? (
        <Button
          type="button"
          variant="ghost"
          className="h-11 shrink-0 font-semibold text-muted-foreground"
          onClick={() => {
            const d = defaultRideListDateRange();
            const next = new URLSearchParams();
            next.set("from", d.from);
            next.set("to", d.to);
            next.set("sort", "recent");
            router.replace(`/gastos?${next.toString()}`);
          }}
        >
          Limpar
        </Button>
      ) : null}
    </section>
  );
}
