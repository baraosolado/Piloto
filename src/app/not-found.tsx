import Link from "next/link";
import { AlertTriangle, ArrowLeft, ChevronRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[max(884px,100dvh)] flex-col bg-[#f9f9f9] text-[#1a1c1c] antialiased">
      <header className="flex w-full items-center justify-between bg-neutral-50 px-6 py-4">
        <Link
          href="/"
          className="flex size-10 items-center justify-center text-black transition-colors hover:bg-neutral-100 active:scale-95"
          aria-label="Voltar ao início"
        >
          <ArrowLeft className="size-6" strokeWidth={2} aria-hidden />
        </Link>
        <span className="text-xl font-black tracking-tighter text-black uppercase">
          Copilote
        </span>
        <div className="w-10 shrink-0" aria-hidden />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="relative mb-12">
            <h1
              className="pointer-events-none absolute left-1/2 -top-12 -z-10 -translate-x-1/2 select-none text-[120px] leading-none font-black tracking-tighter text-black opacity-10 md:text-[180px]"
              aria-hidden
            >
              404
            </h1>
            <div className="flex flex-col items-center gap-6">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-black p-10 shadow-2xl">
                <AlertTriangle
                  className="size-14 text-white"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-black md:text-4xl">
                  Página não encontrada
                </h2>
                <p className="mx-auto max-w-[280px] text-lg font-medium leading-relaxed text-[#474747]">
                  A página que você procura não existe ou foi movida.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-5 px-8 text-lg font-bold tracking-tight text-white uppercase transition-all hover:opacity-90 active:scale-95"
            >
              Voltar para o Dashboard
              <ChevronRight className="size-5" strokeWidth={2} aria-hidden />
            </Link>
            <a
              href="mailto:?subject=%5BCopilote%5D%20Reportar%20problema%20(404)&body=Descreva%20o%20que%20voc%C3%AA%20tentou%20acessar%3A%20"
              className="w-full rounded-lg border-0 bg-transparent py-4 px-8 text-sm font-bold tracking-widest text-[#474747] uppercase transition-all hover:bg-[#f3f3f3] active:scale-95"
            >
              Reportar um problema
            </a>
          </div>

          <div className="mt-16 flex justify-center opacity-20">
            <div className="mx-1 h-1 w-12 rounded-full bg-black" />
            <div className="mx-1 h-1 w-4 rounded-full bg-black" />
            <div className="mx-1 h-1 w-2 rounded-full bg-black" />
          </div>
        </div>
      </main>
    </div>
  );
}
