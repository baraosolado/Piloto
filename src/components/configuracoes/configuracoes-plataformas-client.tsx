"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  PlatformToggleGrid,
  type PlatformId,
} from "@/components/platforms/platform-toggle-grid";
import { Button } from "@/components/ui/button";

export function ConfiguracoesPlataformasClient() {
  const [selected, setSelected] = useState<PlatformId[]>([]);
  const [initial, setInitial] = useState<PlatformId[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const toggle = useCallback((id: PlatformId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/platforms", { credentials: "include" });
        const json = (await res.json()) as {
          data?: { platforms?: string[] };
          error?: { message?: string };
        };
        if (cancelled) return;
        if (!res.ok || json.error) {
          toast.error(json.error?.message ?? "Não foi possível carregar.");
          setSelected([]);
          setInitial([]);
          return;
        }
        const list = (json.data?.platforms ?? []).filter(
          (p): p is PlatformId =>
            p === "uber" || p === "99" || p === "indrive" || p === "particular",
        );
        setSelected(list);
        setInitial(list);
      } catch {
        if (!cancelled) {
          toast.error("Erro ao carregar plataformas.");
          setSelected([]);
          setInitial([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty =
    initial !== null &&
    (selected.length !== initial.length ||
      selected.some((p) => !initial.includes(p)));

  async function save() {
    setTouched(true);
    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma plataforma.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/platforms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: selected }),
      });
      const json = (await res.json()) as {
        data?: unknown;
        error?: { message?: string };
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Não foi possível guardar.");
        return;
      }
      setInitial([...selected]);
      toast.success("Plataformas atualizadas.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        A carregar…
      </div>
    );
  }

  const showError = touched && selected.length === 0;

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Estas opções definem em que apps comparar o seu rendimento (relatórios e
        registro de corridas). Você pode alterar quando quiser.
      </p>

      <PlatformToggleGrid
        selected={selected}
        onToggle={toggle}
        disabled={saving}
        showError={showError}
      />

      <div className="rounded-xl border border-[#006d33]/10 bg-[#6aee8f]/10 p-4">
        <div className="flex gap-3">
          <Info
            className="size-5 shrink-0 text-[#006d33]"
            strokeWidth={2}
            aria-hidden
          />
          <p className="text-sm leading-tight text-[#00461e]">
            É necessário pelo menos uma plataforma ativa para registrar corridas e
            ver comparativos por app.
          </p>
        </div>
      </div>

      <Button
        type="button"
        className="w-full bg-black text-white hover:bg-black/90"
        disabled={saving || !dirty}
        onClick={() => void save()}
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            A guardar…
          </>
        ) : (
          "Guardar alterações"
        )}
      </Button>
    </div>
  );
}
