"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#f9f9f9] font-sans text-[#1a1c1c] antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-6">
          <h1 className="text-2xl font-bold text-black">Algo deu errado</h1>
          <p className="mt-2 max-w-md text-center text-lg text-[#474747]">
            Erro crítico na interface. Tente recarregar a página.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-8 rounded-lg bg-black px-8 py-4 text-lg font-bold tracking-wide text-white uppercase transition-transform active:scale-95"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
