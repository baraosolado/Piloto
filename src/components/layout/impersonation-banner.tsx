"use client";

import { useState } from "react";
import { Eye, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { formatAuthClientError } from "@/lib/auth-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  /** Deve coincidir com o espaçador no AppShell e com o offset sticky do header. */
  barHeightRem: number;
};

/**
 * Barra fixa no topo da área principal (à direita da sidebar em desktop) quando
 * a sessão é de personificação (`impersonatedBy`).
 */
export function ImpersonationBanner({ barHeightRem }: Props) {
  const { data } = authClient.useSession();
  const [pending, setPending] = useState(false);

  const impersonatedBy = (
    data?.session as { impersonatedBy?: string | null } | undefined
  )?.impersonatedBy;

  const user = data?.user as
    | { name?: string | null; email?: string | null }
    | undefined;

  if (!impersonatedBy) {
    return null;
  }

  const display =
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "Utilizador";
  const email = user?.email ?? "";

  async function stop() {
    setPending(true);
    try {
      const res = await authClient.admin.stopImpersonating();
      if (res.error) {
        const { message } = formatAuthClientError(res.error);
        toast.error(message || "Não foi possível despersonificar.");
        return;
      }
      toast.success("Você voltou à conta do administrador.");
      window.location.assign("/mestre/usuarios");
    } finally {
      setPending(false);
    }
  }

  const barStyle = {
    height: `${barHeightRem}rem`,
    minHeight: `${barHeightRem}rem`,
  } as const;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[50] flex w-full items-center gap-3 overflow-hidden border-b border-[#006d33]/50 bg-[#052e16] px-4 py-2 text-white shadow-md md:left-[240px] md:w-auto"
      style={barStyle}
      role="banner"
      aria-label="Modo personificação"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <Eye className="size-5 text-[#6aee8f]" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap">
        <Badge
          variant="secondary"
          className="shrink-0 border-0 bg-[#006d33] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#006d33]"
        >
          Personificação
        </Badge>
        <p className="min-w-0 text-sm font-medium leading-tight">
          <span className="text-white/80">Conta do motorista: </span>
          <span className="text-[#6aee8f]">{display}</span>
          {email ? (
            <span className="ml-1 truncate text-xs font-normal text-white/65">
              {email}
            </span>
          ) : null}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        title="Encerra a personificação e volta ao painel do administrador"
        onClick={() => void stop()}
        className="shrink-0 border border-white/20 bg-white text-[#052e16] hover:bg-white/90"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Voltando…
          </>
        ) : (
          <>
            <Undo2 className="mr-2 size-4" aria-hidden />
            Despersonificar
          </>
        )}
      </Button>
    </div>
  );
}
