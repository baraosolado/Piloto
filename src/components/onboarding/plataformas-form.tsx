"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { ProgressStepSegments } from "@/components/onboarding/progress-steps";
import {
  PlatformToggleGrid,
  type PlatformId,
} from "@/components/platforms/platform-toggle-grid";

export function PlataformasForm() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlatformId[]>([]);
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);

  const toggle = useCallback((id: PlatformId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }, []);

  async function handleNext() {
    setTouched(true);
    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma plataforma.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/platforms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: selected }),
      });

      const json = (await res.json()) as {
        data: unknown;
        error: { code: string; message: string } | null;
      };

      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Não foi possível salvar.");
        return;
      }

      toast.success("Plataformas salvas!");
      router.push("/onboarding/meta");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const showError = touched && selected.length === 0;

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f9f9f9] text-[#1a1c1c] antialiased">
      <header className="sticky top-0 z-40 w-full bg-white shadow-sm shadow-black/5">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-4">
          <Link
            href="/onboarding/veiculo"
            className="rounded-full p-2 text-black transition-colors hover:bg-gray-100 active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-6" strokeWidth={2} />
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-black">
            Passo 2 de 3
          </h1>
          <div className="w-10 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="w-full max-w-[520px] flex-1 px-6 pt-8 pb-40">
        <ProgressStepSegments />

        <div className="mb-10 text-center">
          <h2 className="mb-4 text-[32px] leading-tight font-black tracking-tighter text-black">
            Em quais plataformas você trabalha?
          </h2>
          <p className="text-lg leading-relaxed text-[#474747]">
            Selecione todas que se aplicam. Isso nos ajuda a comparar seu
            rendimento por app.
          </p>
        </div>

        <PlatformToggleGrid
          selected={selected}
          onToggle={toggle}
          disabled={pending}
          showError={showError}
        />

        <div className="mt-8 rounded-xl border border-[#006d33]/10 bg-[#6aee8f]/10 p-4">
          <div className="flex gap-3">
            <Info
              className="size-5 shrink-0 text-[#006d33]"
              strokeWidth={2}
              aria-hidden
            />
            <p className="text-sm leading-tight text-[#00461e]">
              Você poderá alterar isso depois em{" "}
              <strong className="font-semibold">Configurações → Plataformas</strong>
              .
            </p>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-between border-t border-gray-100 bg-white/80 px-8 pt-4 pb-10 backdrop-blur-xl">
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push("/onboarding/veiculo")}
          className="flex flex-col items-center justify-center px-6 py-2 text-gray-500 transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          <ChevronLeft className="mb-1 size-6" strokeWidth={2} />
          <span className="text-xs font-medium tracking-widest uppercase">
            Voltar
          </span>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleNext}
          className="flex flex-col items-center justify-center rounded-xl bg-black px-8 py-3 text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          <ChevronRight className="mb-1 size-6" strokeWidth={2} />
          <span className="text-xs font-medium tracking-widest uppercase">
            Próximo
          </span>
        </button>
      </nav>
    </div>
  );
}
