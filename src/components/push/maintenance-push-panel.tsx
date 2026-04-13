"use client";

import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isPushApiSupported, urlBase64ToUint8Array } from "@/lib/push-client";
import { cn } from "@/lib/utils";

type StatusPayload = {
  serverReady: boolean;
  subscriptionCount: number;
};

export function MaintenancePushPanel({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] =
    useState<NotificationPermission | "unsupported">("unsupported");

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/push/status", { credentials: "include" });
      const json = (await res.json()) as {
        data: StatusPayload | null;
        error: { message?: string } | null;
      };
      if (!res.ok || json.error || !json.data) {
        setStatus(null);
        return;
      }
      setStatus(json.data);
    } catch {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isPushApiSupported()) {
      setPerm("unsupported");
      setLoadingStatus(false);
      return;
    }
    setPerm(Notification.permission);
    void refreshStatus();
  }, [mounted, refreshStatus]);

  const supported = mounted && isPushApiSupported();
  const subscribed =
    supported &&
    perm === "granted" &&
    (status?.subscriptionCount ?? 0) > 0;

  async function enablePush() {
    if (!supported) {
      toast.error("Seu navegador não suporta notificações push.");
      return;
    }
    if (!status?.serverReady) {
      toast.error("Servidor sem push configurado (VAPID).");
      return;
    }

    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await reg.update();

      const vapidRes = await fetch("/api/push/vapid-public-key", {
        credentials: "include",
      });
      const vapidJson = (await vapidRes.json()) as {
        data: { publicKey: string } | null;
        error: { message?: string } | null;
      };
      if (!vapidRes.ok || !vapidJson.data?.publicKey) {
        toast.error(
          vapidJson.error?.message ?? "Não foi possível obter a chave pública.",
        );
        return;
      }

      const permission = await Notification.requestPermission();
      setPerm(permission);
      if (permission !== "granted") {
        toast.error("Permissão de notificação negada.");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidJson.data.publicKey),
      });

      const subJson = sub.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        toast.error("Inscrição push incompleta.");
        return;
      }

      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
        }),
      });
      const saveJson = (await saveRes.json()) as {
        error: { message?: string } | null;
      };
      if (!saveRes.ok || saveJson.error) {
        toast.error(saveJson.error?.message ?? "Erro ao salvar inscrição.");
        return;
      }

      toast.success("Notificações de manutenção ativadas neste dispositivo.");
      await refreshStatus();
    } catch {
      toast.error("Falha ao ativar notificações.");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
        await sub.unsubscribe();
      }
      toast.message("Notificações desativadas neste dispositivo.");
      await refreshStatus();
    } catch {
      toast.error("Erro ao desativar.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        error: { message?: string } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Teste falhou.");
        return;
      }
      toast.success(
        "Push enviado. Olhe o canto da tela (Windows: ícone de balão) ou minimize o Chrome — com o site em primeiro plano o banner às vezes não aparece.",
        { duration: 8000 },
      );
    } catch {
      toast.error("Teste falhou.");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Carregando preferências de notificação…
      </div>
    );
  }

  if (!supported) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        Seu navegador não suporta notificações push (use Chrome, Edge ou
        Firefox recente, em HTTPS ou localhost).
      </div>
    );
  }

  if (loadingStatus) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Carregando preferências de notificação…
      </div>
    );
  }

  if (!status?.serverReady) {
    return (
      <div
        className={cn(
          "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950",
          className,
        )}
      >
        Notificações push ainda não estão disponíveis: confira no{" "}
        <code className="rounded bg-amber-100/80 px-1 text-xs">.env.local</code>{" "}
        as variáveis{" "}
        <code className="rounded bg-amber-100/80 px-1 text-xs">
          VAPID_PUBLIC_KEY
        </code>
        ,{" "}
        <code className="rounded bg-amber-100/80 px-1 text-xs">
          VAPID_PRIVATE_KEY
        </code>{" "}
        e{" "}
        <code className="rounded bg-amber-100/80 px-1 text-xs">
          VAPID_SUBJECT
        </code>{" "}
        (ex. <code className="text-xs">mailto:voce@email.com</code>). Sem espaço
        ao redor do <code className="text-xs">=</code>. Depois de salvar,{" "}
        <strong>reinicie o npm run dev</strong>.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
            {subscribed ? (
              <Bell className="size-5" strokeWidth={2} aria-hidden />
            ) : (
              <BellOff className="size-5" strokeWidth={2} aria-hidden />
            )}
          </div>
          <div>
            <p className="font-bold text-foreground">
              Alertas de manutenção no sistema
            </p>
            <p className="text-sm text-muted-foreground">
              Aviso quando óleo, pneus ou revisão estiverem próximos ou
              atrasados (até 1 lembrete a cada ~20 h com alerta ativo).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {subscribed ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void sendTest()}
                className="gap-1.5"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Testar
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void disablePush()}
              >
                Desativar
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              className="bg-black font-bold text-white hover:bg-black/90"
              disabled={busy}
              onClick={() => void enablePush()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Ativar notificações"
              )}
            </Button>
          )}
        </div>
      </div>
      {perm === "denied" ? (
        <p className="mt-3 text-xs text-destructive">
          O navegador bloqueou notificações. Libere em Configurações do site →
          Notificações.
        </p>
      ) : null}
    </div>
  );
}
