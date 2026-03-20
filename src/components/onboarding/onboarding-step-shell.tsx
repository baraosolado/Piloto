"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { ProgressSteps } from "@/components/onboarding/progress-steps";
import { cn } from "@/lib/utils";

type OnboardingStepShellProps = {
  title: string;
  backHref: string;
  children: ReactNode;
  /** Fundo da página (veículo usa branco; passos 2–3 usam cinza claro) */
  backgroundClassName?: string;
};

export function OnboardingStepShell({
  title,
  backHref,
  children,
  backgroundClassName = "bg-[#f9f9f9]",
}: OnboardingStepShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen text-[#1a1c1c] antialiased",
        backgroundClassName,
      )}
    >
      <header
        className={cn("sticky top-0 z-50 w-full", backgroundClassName)}
      >
        <div className="mx-auto flex h-16 max-w-screen-xl items-center px-6">
          <Link
            href={backHref}
            className="mr-4 text-black transition-transform hover:opacity-80 active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-6" strokeWidth={2} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-black">{title}</h1>
          <div className="ml-auto">
            <button
              type="button"
              className="text-black transition-transform active:scale-95"
              aria-label="Ajuda"
            >
              <CircleHelp className="size-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[520px] flex-col gap-10 px-6 py-8 pb-32">
        <ProgressSteps />
        {children}
      </main>
    </div>
  );
}
