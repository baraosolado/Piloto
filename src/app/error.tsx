"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const codeLabel = error.digest
    ? error.digest
    : "Erro inesperado no aplicativo";

  return (
    <div className="flex min-h-[50vh] flex-col bg-[#f9f9f9] text-[#1a1c1c] antialiased">
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="relative mx-auto flex size-32 items-center justify-center">
            <div className="absolute inset-0 scale-110 rounded-full bg-[#f3f3f3] opacity-50" />
            <div className="relative flex size-full items-center justify-center rounded-full bg-white shadow-sm">
              <AlertTriangle
                className="size-14 text-black"
                strokeWidth={1.5}
                aria-hidden
              />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-black">
              Algo deu errado
            </h1>
            <p className="px-4 text-lg leading-relaxed text-[#474747]">
              Nosso time foi notificado. Tente novamente em alguns instantes.
            </p>
          </div>

          <div className="px-2 pt-4">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full rounded-lg bg-black py-5 text-lg font-bold tracking-wider text-white uppercase shadow-lg transition-transform active:scale-95"
            >
              Tentar novamente
            </button>
            <Link
              href="/dashboard"
              className="mt-4 flex w-full items-center justify-center rounded-lg border border-black py-4 text-sm font-bold tracking-wide text-black uppercase transition-colors hover:bg-black/5"
            >
              Ir para o Dashboard
            </Link>

            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-[10px] font-bold tracking-widest text-[#777777] uppercase">
                Código do erro
              </p>
              <div className="rounded-full bg-[#e8e8e8] px-4 py-1">
                <span className="font-mono text-xs text-[#3b3b3b]">
                  {codeLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
