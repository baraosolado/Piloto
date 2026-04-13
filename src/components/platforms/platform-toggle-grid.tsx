"use client";

import type { ReactNode } from "react";
import { Car, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlatformId = "uber" | "99" | "indrive" | "particular";

export const PLATFORM_OPTIONS: {
  id: PlatformId;
  label: string;
  iconBox: () => ReactNode;
}[] = [
  {
    id: "uber",
    label: "Uber",
    iconBox: () => (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-black">
        <span className="text-sm font-black tracking-tight text-white">Uber</span>
      </div>
    ),
  },
  {
    id: "99",
    label: "99",
    iconBox: () => (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#facc15]">
        <span className="text-2xl font-black tracking-tighter text-black">99</span>
      </div>
    ),
  },
  {
    id: "indrive",
    label: "inDrive",
    iconBox: () => (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500">
        <span className="text-center text-[11px] font-bold leading-tight text-white">
          in
          <span className="text-white/95">Drive</span>
        </span>
      </div>
    ),
  },
  {
    id: "particular",
    label: "Corridas particulares",
    iconBox: () => (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#eeeeee]">
        <Car className="size-7 text-black" strokeWidth={1.75} />
      </div>
    ),
  },
];

type Props = {
  selected: PlatformId[];
  onToggle: (id: PlatformId) => void;
  disabled?: boolean;
  showError?: boolean;
  errorId?: string;
};

export function PlatformToggleGrid({
  selected,
  onToggle,
  disabled,
  showError,
  errorId = "platforms-error",
}: Props) {
  return (
    <>
      <div
        className="grid grid-cols-1 gap-4"
        role="group"
        aria-label="Plataformas"
        aria-describedby={showError ? errorId : undefined}
      >
        {PLATFORM_OPTIONS.map(({ id, label, iconBox }) => {
          const isOn = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(id)}
              aria-pressed={isOn}
              className={cn(
                "group relative flex scale-[0.98] items-center justify-between rounded-xl border-2 bg-white p-5 text-left transition-all active:duration-150",
                isOn
                  ? "border-black shadow-sm"
                  : "border-transparent hover:border-[#e2e2e2]",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              <div className="flex items-center gap-4">
                {iconBox()}
                <span className="text-xl font-bold text-black">{label}</span>
              </div>
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isOn
                    ? "border-[#006d33] bg-[#006d33]"
                    : "border-[#e2e2e2] bg-transparent",
                )}
              >
                {isOn ? (
                  <Check className="size-3.5 text-white" strokeWidth={3} />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      {showError ? (
        <p id={errorId} className="mt-4 text-sm text-[#ba1a1a]">
          Escolha pelo menos uma plataforma.
        </p>
      ) : null}
    </>
  );
}
