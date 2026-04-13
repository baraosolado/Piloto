import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PremiumGateProps = {
  /** Conteúdo exibido normalmente (premium) ou por baixo do blur (free). */
  children: React.ReactNode;
  /** Nome curto da feature para o banner. */
  feature: string;
  /** Plano do usuário (definido no servidor). */
  isPremium: boolean;
};

export function PremiumGate({
  children,
  feature,
  isPremium,
}: PremiumGateProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div
        className="sticky top-0 z-50 flex flex-col gap-3 border-b border-border bg-black px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between"
        role="region"
        aria-label="Upgrade para Premium"
      >
        <p className="text-sm font-bold tracking-tight">
          Esta feature é exclusiva do plano Premium
          {feature ? (
            <span className="mt-0.5 block text-xs font-medium text-white/70">
              {feature}
            </span>
          ) : null}
        </p>
        <Button
          asChild
          className="h-10 shrink-0 bg-[#00a651] font-bold text-white hover:bg-[#00a651]/90"
        >
          <Link href="/configuracoes/plano">Premium — 7 dias grátis</Link>
        </Button>
      </div>
      <div
        className={cn(
          "pointer-events-none select-none blur-[4px]",
          "motion-reduce:blur-none motion-reduce:opacity-60",
        )}
        aria-hidden
      >
        {children}
      </div>
    </div>
  );
}
