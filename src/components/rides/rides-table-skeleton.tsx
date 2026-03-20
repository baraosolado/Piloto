import { Skeleton } from "@/components/ui/skeleton";

export function RidesTableSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-11 w-44" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-6 gap-3 border-b bg-muted/40 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-6 gap-3 border-b border-border/80 p-4 last:border-0"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
