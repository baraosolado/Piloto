import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GastosView } from "@/components/expenses/gastos-view";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultRideListDateRange } from "@/lib/corridas-default-range";
import { requireSession } from "@/lib/get-session";
import {
  countExpensesThisMonth,
  getEffectivePlan,
  isFreeExpenseLimitReached,
} from "@/lib/plan-limits";

function GastosFallback() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-11 w-36" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const userId = session.user.id;

  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;

  if (!from || !to) {
    const d = defaultRideListDateRange();
    const next = new URLSearchParams();
    next.set("from", d.from);
    next.set("to", d.to);
    const category =
      typeof sp.category === "string" ? sp.category : undefined;
    const sort = typeof sp.sort === "string" ? sp.sort : undefined;
    const page = typeof sp.page === "string" ? sp.page : undefined;
    if (category) next.set("category", category);
    if (sort) next.set("sort", sort);
    if (page) next.set("page", page);
    redirect(`/gastos?${next.toString()}`);
  }
  const plan = await getEffectivePlan(userId, session.user.email);
  const expensesThisMonth = await countExpensesThisMonth(userId);
  const showFreeLimitBanner =
    plan === "free" && isFreeExpenseLimitReached(expensesThisMonth);

  return (
    <Suspense fallback={<GastosFallback />}>
      <GastosView showFreeLimitBanner={showFreeLimitBanner} />
    </Suspense>
  );
}
