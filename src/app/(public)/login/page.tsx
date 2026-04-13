import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

function LoginFormFallback() {
  return (
    <div className="w-full space-y-8">
      <div className="h-14 w-full animate-pulse rounded-b-lg bg-[#e8e8e8]" />
      <div className="h-14 w-full animate-pulse rounded-b-lg bg-[#e8e8e8]" />
      <div className="h-14 w-full animate-pulse rounded-lg bg-black/80" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[max(884px,100dvh)] flex-col bg-[#f9f9f9] font-sans text-[#1a1c1c] antialiased">
      <header className="sticky top-0 z-50 w-full bg-[#f9f9f9]">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-md p-1 text-black transition-opacity [-webkit-tap-highlight-color:transparent] hover:opacity-70 active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-6" strokeWidth={2} aria-hidden />
            </Link>
            <span className="text-2xl font-black tracking-tighter text-black uppercase">
              Copilote
            </span>
          </div>
        </div>
      </header>

      <div className="pointer-events-none fixed top-0 right-0 -z-10 opacity-20">
        <div className="size-96 rounded-full bg-[#6aee8f] blur-[120px]" />
      </div>
      <div className="pointer-events-none fixed bottom-0 left-0 -z-10 opacity-10">
        <div className="size-[500px] rounded-full bg-black blur-[150px]" />
      </div>

      <main className="mx-auto flex w-full max-w-md flex-grow flex-col items-center justify-center px-6 py-8">
        <div className="mb-12 w-full text-center md:text-left">
          <h1 className="mb-2 text-4xl leading-tight font-bold tracking-tight text-black sm:text-5xl md:text-[56px]">
            Bem-vindo de volta
          </h1>
          <p className="font-medium text-[#777777]">
            Acesse sua cabine de comando.
          </p>
        </div>

        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
