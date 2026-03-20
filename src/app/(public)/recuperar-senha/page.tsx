import { Suspense } from "react";
import { RecuperarSenhaClient } from "@/components/auth/recuperar-senha-client";

function RecuperarSenhaFallback() {
  return (
    <div className="flex min-h-[max(884px,100dvh)] flex-col bg-[#f9f9f9]">
      <div className="mx-auto h-16 w-full max-w-xl animate-pulse bg-white" />
      <div className="mx-auto mt-24 w-full max-w-md space-y-6 px-6">
        <div className="h-10 w-3/4 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-24 animate-pulse rounded-xl bg-white shadow-sm" />
      </div>
    </div>
  );
}

export default function RecuperarSenhaPage() {
  return (
    <Suspense fallback={<RecuperarSenhaFallback />}>
      <RecuperarSenhaClient />
    </Suspense>
  );
}
