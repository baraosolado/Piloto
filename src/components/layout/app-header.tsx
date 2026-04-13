import { cn } from "@/lib/utils";

export function AppHeader({ stickyTopRem = 0 }: { stickyTopRem?: number }) {
  return (
    <header
      className={cn(
        "sticky z-20 flex h-14 shrink-0 items-center border-b border-border bg-card px-4 md:px-6",
        stickyTopRem > 0 ? "shadow-sm" : null,
      )}
      style={
        stickyTopRem > 0
          ? { top: `${stickyTopRem}rem` }
          : { top: 0 }
      }
    >
      <span className="text-sm font-semibold text-foreground md:hidden">
        Copilote
      </span>
    </header>
  );
}
