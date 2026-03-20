import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-muted md:flex-row">
      <aside className="hidden h-full w-[240px] shrink-0 flex-col gap-3 border-r border-white/10 bg-black p-4 md:flex">
        <Skeleton className="h-9 w-full rounded-lg bg-white/10" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg bg-white/10" />
        ))}
        <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
          <Skeleton className="mx-auto size-10 rounded-full bg-white/10" />
          <Skeleton className="mx-auto h-3 w-[75%] bg-white/10" />
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted">
        <div className="flex h-14 shrink-0 items-center border-b border-border bg-card px-4 md:px-6">
          <Skeleton className="h-4 w-20 md:hidden" />
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
          <DashboardSkeleton />
        </div>
      </div>
    </div>
  );
}
