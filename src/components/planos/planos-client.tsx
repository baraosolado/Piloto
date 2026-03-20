"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PlanosClientProps = {
  isPremiumEffective: boolean;
  canOpenBillingPortal: boolean;
};

export function PlanosSubscribeActions({
  isPremiumEffective,
  canOpenBillingPortal,
}: PlanosClientProps) {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);

  const subscribe = async () => {
    setLoading("checkout");
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: { url?: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.url) {
        throw new Error(
          json.error?.message ?? "Não foi possível iniciar o checkout.",
        );
      }
      window.location.href = json.data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao assinar.");
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/create-portal", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: { url?: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.url) {
        throw new Error(
          json.error?.message ?? "Não foi possível abrir o portal de cobrança.",
        );
      }
      window.location.href = json.data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir portal.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {!isPremiumEffective ? (
        <Button
          type="button"
          className="mt-10 h-14 w-full rounded-xl text-sm font-black uppercase tracking-widest"
          onClick={subscribe}
          disabled={loading !== null}
        >
          {loading === "checkout" ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            "Assinar Premium"
          )}
        </Button>
      ) : canOpenBillingPortal ? (
        <Button
          type="button"
          variant="outline"
          className="mt-10 h-14 w-full rounded-xl border-2 border-black text-sm font-black uppercase tracking-widest"
          onClick={openPortal}
          disabled={loading !== null}
        >
          {loading === "portal" ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            "Gerenciar assinatura"
          )}
        </Button>
      ) : (
        <p className="mt-10 text-center text-xs font-medium text-muted-foreground">
          Acesso Premium ativo nesta conta.
        </p>
      )}
    </>
  );
}
