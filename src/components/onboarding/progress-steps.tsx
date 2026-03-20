"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const STEPS = [
  { path: "/onboarding/veiculo", index: 1, name: "Seu veículo" },
  { path: "/onboarding/plataformas", index: 2, name: "Plataformas" },
  { path: "/onboarding/meta", index: 3, name: "Sua meta" },
] as const;

export function ProgressSteps() {
  const pathname = usePathname();
  const current =
    STEPS.find((s) => pathname.startsWith(s.path)) ?? STEPS[0];

  return (
    <div className="mb-10 flex flex-col gap-4">
      <div className="flex items-center gap-2" role="list" aria-label="Etapas">
        {STEPS.map(({ index }) => (
          <div
            key={index}
            role="listitem"
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              index <= current.index ? "bg-black" : "border border-[#c6c6c6] bg-transparent",
            )}
            aria-current={index === current.index ? "step" : undefined}
          />
        ))}
      </div>
      <p className="text-xs font-medium tracking-wide text-[#474747] uppercase">
        Passo {current.index} de 3 — {current.name}
      </p>
    </div>
  );
}

/** Etapa atual em barra horizontal; demais em pontos — alinhado ao mock de plataformas. */
export function ProgressStepSegments() {
  const pathname = usePathname();
  const current =
    STEPS.find((s) => pathname.startsWith(s.path)) ?? STEPS[0];

  return (
    <div
      className="mb-10 flex justify-center gap-2"
      role="navigation"
      aria-label={`Passo ${current.index} de 3 — ${current.name}`}
    >
      {STEPS.map(({ index }) =>
        index === current.index ? (
          <div
            key={index}
            className="h-2 w-8 rounded-full bg-black"
            aria-current="step"
          />
        ) : (
          <div
            key={index}
            className="h-2 w-2 shrink-0 rounded-full bg-[#e2e2e2]"
            aria-hidden
          />
        ),
      )}
    </div>
  );
}

/** Três pontos: etapa atual preenchida (mock passo 3). */
export function ProgressStepDots() {
  const pathname = usePathname();
  const current =
    STEPS.find((s) => pathname.startsWith(s.path)) ?? STEPS[0];

  return (
    <div
      className="mb-10 flex flex-col items-center"
      role="navigation"
      aria-label={`Passo ${current.index} de 3 — ${current.name}`}
    >
      <div className="mb-4 flex gap-2">
        {STEPS.map(({ index }) => (
          <div
            key={index}
            className={cn(
              "size-2.5 shrink-0 rounded-full transition-colors",
              index === current.index ? "bg-black" : "bg-[#e2e2e2]",
            )}
            aria-current={index === current.index ? "step" : undefined}
          />
        ))}
      </div>
      <p className="text-sm font-medium tracking-tight text-[#474747]">
        Passo {current.index} de 3 — {current.name}
      </p>
    </div>
  );
}
