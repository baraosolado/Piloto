"use client";

import { useEffect, useState } from "react";
import { Database, Download, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EXCLUIR = "EXCLUIR";

export function ConfiguracoesContaClient() {
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [lgpdBanner, setLgpdBanner] = useState<"loading" | "show" | "hide">(
    "loading",
  );
  const [lgpdSaving, setLgpdSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/lgpd-consent", {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          setLgpdBanner("hide");
          return;
        }
        const j = (await res.json()) as {
          data?: { acceptedAt?: string | null };
        };
        const at = j.data?.acceptedAt;
        setLgpdBanner(at ? "hide" : "show");
      } catch {
        if (!cancelled) setLgpdBanner("hide");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function recordLgpdConsent() {
    setLgpdSaving(true);
    try {
      const res = await fetch("/api/user/lgpd-consent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = (await res.json().catch(() => null)) as {
        data?: { acceptedAt?: string };
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        throw new Error(j?.error?.message ?? "Não foi possível registar.");
      }
      setLgpdBanner("hide");
      toast.success("Consentimento registado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registar.");
    } finally {
      setLgpdSaving(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/user/export", { credentials: "include" });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(j?.error?.message ?? "Falha ao exportar.");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      let filename = "copilote-export.zip";
      const m = cd && /filename="([^"]+)"/.exec(cd);
      if (m?.[1]) filename = m[1];
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(href);
      toast.success("Download iniciado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(j?.error?.message ?? "Não foi possível excluir a conta.");
      }
      toast.success("Conta excluída.");
      setDeleteOpen(false);
      window.location.href = "/";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-black">
          <Database className="size-6" aria-hidden />
          Dados
        </h3>
        <div className="rounded-xl border border-border bg-white p-6 transition-colors hover:bg-muted/30">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex-1 space-y-2">
              <p className="text-lg font-bold text-black">
                Exportar meus dados
              </p>
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                LGPD • Arquivo ZIP com JSON
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                Baixe uma cópia das suas informações de perfil, veículo,
                corridas, gastos, metas e manutenções.
              </p>
            </div>
            <Button
              type="button"
              className="h-12 shrink-0 gap-2 font-bold"
              onClick={exportData}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  Exportar
                  <Download className="size-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {lgpdBanner === "show" ? (
        <section
          id="registo-consentimento-lgpd"
          className="scroll-mt-24 space-y-4"
        >
          <h3 className="text-xl font-bold text-black">Consentimento LGPD</h3>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6">
            <p className="mb-4 text-sm text-amber-950/90">
              Ainda não há registo no servidor da aceitação da Política de
              Privacidade e dos Termos. Toque abaixo para gravar agora (é
              necessário uma única vez).
            </p>
            <Button
              type="button"
              className="h-12 font-bold"
              onClick={recordLgpdConsent}
              disabled={lgpdSaving}
            >
              {lgpdSaving ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                "Registar consentimento"
              )}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-destructive">
          <TriangleAlert className="size-6" aria-hidden />
          Zona de perigo
        </h3>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8">
          <p className="mb-2 text-lg font-bold text-destructive">
            Excluir conta
          </p>
          <p className="mb-6 text-sm leading-relaxed text-destructive/90">
            Esta ação é irreversível. Todos os seus dados serão removidos dos
            nossos servidores, incluindo histórico de corridas e gastos.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              className="h-12 font-bold"
              onClick={() => {
                setConfirmText("");
                setDeleteOpen(true);
              }}
            >
              Excluir minha conta
            </Button>
          </div>
        </div>
      </section>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left">
                <p>
                  Digite <strong>{EXCLUIR}</strong> para confirmar que deseja
                  apagar permanentemente sua conta e todos os dados.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="excluir-input">Confirmação</Label>
                  <Input
                    id="excluir-input"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={EXCLUIR}
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Manter conta</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmText !== EXCLUIR || deleting}
              onClick={deleteAccount}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Excluir definitivamente"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
