import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CadastroForm } from "@/components/auth/cadastro-form";

export default function CadastroPage() {
  return (
    <div className="min-h-[max(884px,100dvh)] bg-[#f9f9f9] font-sans text-[#1a1c1c] antialiased">
      <header className="sticky top-0 z-50 w-full bg-white">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="-ml-1 rounded-md p-1 text-black transition-opacity [-webkit-tap-highlight-color:transparent] hover:opacity-80 active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-6" strokeWidth={2} aria-hidden />
            </Link>
          </div>
          <div className="text-2xl font-black tracking-tighter text-black">
            PILOTO
          </div>
          <div className="w-6 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="flex min-h-[calc(100dvh-4.5rem)] flex-col items-center px-6 pt-12 pb-24">
        <div className="mb-10 w-full max-w-[400px] text-center">
          <h1 className="mb-4 text-[2.5rem] leading-[1.1] font-bold tracking-tighter text-black sm:text-[3.5rem]">
            Crie sua conta
          </h1>
          <p className="font-medium text-[#474747]">
            Grátis para sempre. Sem cartão necessário.
          </p>
        </div>
        <CadastroForm />
      </main>
    </div>
  );
}
