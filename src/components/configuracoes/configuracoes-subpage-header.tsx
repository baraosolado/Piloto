import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ConfiguracoesSubpageHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 -mx-6 mb-6 border-b border-zinc-200/70 bg-zinc-50/95 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-50/85">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-2">
        <Link
          href="/configuracoes"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-black transition-transform hover:bg-zinc-200 active:scale-95"
          aria-label="Voltar às configurações"
        >
          <ArrowLeft className="size-6" strokeWidth={2} />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-black md:text-2xl">
          {title}
        </h1>
      </div>
    </header>
  );
}
