"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Mail,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const requestSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .refine(
        (p) =>
          /[0-9]/.test(p) || /[^A-Za-zÀ-ÿ0-9\s]/.test(p),
        "Inclua pelo menos um número ou um símbolo",
      ),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type RequestValues = z.infer<typeof requestSchema>;
type NewPasswordValues = z.infer<typeof newPasswordSchema>;

const fieldRequest =
  "h-auto w-full rounded-b-lg border-0 border-b-2 border-transparent bg-[#e8e8e8] px-4 py-4 text-[#1a1c1c] shadow-none transition-all placeholder:text-[#777777]/50 focus-visible:border-[#006d33] focus-visible:ring-0";

const labelSm =
  "ml-1 text-xs font-medium tracking-widest text-[#474747] uppercase";

function getAppOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "";
}

export function RecuperarSenhaClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const qpError = searchParams.get("error");

  const [phase, setPhase] = useState<"request" | "sent">("request");
  const [sentToEmail, setSentToEmail] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const isNewPassword = Boolean(token);

  useEffect(() => {
    if (qpError === "INVALID_TOKEN") {
      toast.error("Link inválido ou expirado. Peça um novo e-mail.");
    }
  }, [qpError]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendSeconds]);

  const sendResetEmail = useCallback(async (email: string) => {
    const origin = getAppOrigin();
    // Better Auth 1.2: fluxo de reset via `forgetPassword` + `redirectTo` (retorno com ?token= na mesma rota).
    const redirectTo = `${origin}/recuperar-senha`;
    const result = await authClient.forgetPassword({
      email,
      redirectTo,
    });
    if (result.error) {
      toast.error(
        result.error.message ?? "Não foi possível enviar o e-mail. Tente de novo.",
      );
      return false;
    }
    return true;
  }, []);

  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });

  const newPwForm = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  });

  const pw = newPwForm.watch("password");
  const rules = useMemo(
    () => ({
      len: pw.length >= 8,
      symbolOrNumber:
        /[0-9]/.test(pw) || /[^A-Za-zÀ-ÿ0-9\s]/.test(pw),
    }),
    [pw],
  );

  async function onRequestSubmit(data: RequestValues) {
    const ok = await sendResetEmail(data.email);
    if (!ok) return;
    setSentToEmail(data.email);
    setPhase("sent");
    setResendSeconds(60);
    toast.success("Se o e-mail existir, você receberá o link em instantes.");
  }

  async function onResend() {
    if (resendSeconds > 0 || !sentToEmail) return;
    const ok = await sendResetEmail(sentToEmail);
    if (ok) {
      setResendSeconds(60);
      toast.success("Reenviamos o link.");
    }
  }

  async function onNewPasswordSubmit(data: NewPasswordValues) {
    if (!token) return;
    const result = await authClient.resetPassword({
      newPassword: data.password,
      token,
    });
    if (result.error) {
      toast.error(
        result.error.message ?? "Não foi possível alterar a senha. Tente outro link.",
      );
      return;
    }
    toast.success("Senha atualizada! Faça login com a nova senha.");
    router.push("/login");
    router.refresh();
  }

  function openMailProvider() {
    if (sentToEmail) {
      window.location.href = `mailto:${sentToEmail}`;
    }
  }

  return (
    <div className="flex min-h-[max(884px,100dvh)] flex-col bg-[#f9f9f9] text-[#1a1c1c] antialiased">
      <header className="sticky top-0 z-50 mx-auto w-full max-w-xl bg-white">
        <div className="grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center px-6">
          <div className="flex justify-start">
            <Link
              href="/login"
              className="rounded-md p-1 text-black transition-opacity [-webkit-tap-highlight-color:transparent] hover:opacity-70 active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-6" strokeWidth={2} />
            </Link>
          </div>
          <span className="text-center text-2xl font-black tracking-tighter text-black">
            PILOTO
          </span>
          <div className="w-6 justify-self-end" aria-hidden />
        </div>
      </header>

      {phase === "request" && !isNewPassword && (
        <main className="flex flex-grow flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-12 text-center md:text-left">
              <h1 className="mb-4 text-4xl font-bold tracking-tight text-black md:text-5xl">
                Recuperar senha
              </h1>
              <p className="max-w-sm text-lg leading-relaxed text-[#474747]">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <div className="rounded-xl bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <form
                onSubmit={requestForm.handleSubmit(onRequestSubmit)}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <label htmlFor="rec-email" className={cn(labelSm, "px-1")}>
                    Email
                  </label>
                  <div className="relative">
                    <Input
                      id="rec-email"
                      type="email"
                      autoComplete="email"
                      placeholder="exemplo@email.com"
                      disabled={requestForm.formState.isSubmitting}
                      className={cn(
                        fieldRequest,
                        "pr-12",
                        requestForm.formState.errors.email &&
                          "border-b-[#ba1a1a]",
                      )}
                      {...requestForm.register("email")}
                    />
                    <div
                      className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[#c6c6c6]"
                      aria-hidden
                    >
                      <Mail className="size-5" strokeWidth={1.5} />
                    </div>
                  </div>
                  {requestForm.formState.errors.email && (
                    <p className="text-xs text-[#ba1a1a]">
                      {requestForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={requestForm.formState.isSubmitting}
                  className="flex h-auto w-full items-center justify-center gap-3 rounded-lg bg-black py-4 text-lg font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  {requestForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <span>Enviar link de recuperação</span>
                      <ArrowRight className="size-5" strokeWidth={2} />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-bold tracking-tighter text-black uppercase underline decoration-2 decoration-[#c6c6c6] underline-offset-4 transition-all hover:decoration-black"
                >
                  <LogIn className="size-4" strokeWidth={2} />
                  Voltar para o login
                </Link>
              </div>
            </div>

            <div className="pointer-events-none mt-12 flex justify-center opacity-10 grayscale">
              <div className="relative flex size-32 items-center justify-center rounded-full border-8 border-black">
                <div className="absolute top-2 h-12 w-1 origin-bottom rounded-full bg-black" />
              </div>
            </div>
          </div>
        </main>
      )}

      {phase === "sent" && !isNewPassword && (
        <main className="mx-auto flex w-full max-w-xl flex-grow flex-col items-center px-6 pt-8 pb-24">
          <div className="relative mb-12 flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-xl bg-[#f3f3f3]">
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, #000 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
              aria-hidden
            />
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-black shadow-2xl">
                <Mail className="size-10 text-white" strokeWidth={1.5} />
              </div>
              <div className="h-1 w-12 rounded-full bg-[#006d33]" />
            </div>
          </div>

          <div className="w-full space-y-4 text-center">
            <h2 className="text-4xl leading-[1.1] font-bold tracking-tighter text-black sm:text-5xl md:text-[56px]">
              Verifique seu email
            </h2>
            <p className="mx-auto max-w-[320px] text-lg font-medium leading-relaxed text-[#474747]">
              Enviamos para{" "}
              <span className="font-bold text-black">{sentToEmail}</span>. O
              link expira em 1 hora. Clique no link do e-mail para criar uma nova
              senha.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center rounded-full bg-[#e8e8e8] px-3 py-1 text-[10px] font-bold tracking-widest text-[#474747] uppercase">
                <Clock className="mr-1 size-3.5" strokeWidth={2} />
                O link expira em 1 hora
              </span>
            </div>
          </div>

          <div className="mt-16 w-full space-y-6">
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full border-0 bg-black py-5 text-lg font-bold text-white shadow-none hover:bg-black/90"
              onClick={() => openMailProvider()}
            >
              Abrir e-mail
              <ExternalLink className="ml-2 size-5" strokeWidth={2} />
            </Button>
            <div className="text-center">
              <button
                type="button"
                disabled={resendSeconds > 0}
                onClick={onResend}
                className={cn(
                  "mx-auto flex items-center justify-center gap-2 text-sm font-medium transition-opacity",
                  resendSeconds > 0
                    ? "cursor-not-allowed opacity-60 text-[#777777]"
                    : "text-black hover:underline",
                )}
              >
                Não recebi o e-mail — Reenviar
                {resendSeconds > 0 && (
                  <span className="tabular-nums">
                    em {String(Math.floor(resendSeconds / 60)).padStart(2, "0")}
                    :{String(resendSeconds % 60).padStart(2, "0")}
                  </span>
                )}
              </button>
            </div>
          </div>

          <p className="mx-auto mt-auto pt-12 text-center text-[10px] font-black tracking-[0.2em] text-black/30 uppercase">
            Piloto • recuperação segura
          </p>
        </main>
      )}

      {isNewPassword && (
        <main className="mx-auto flex w-full max-w-xl flex-grow flex-col px-6 pt-12 pb-16">
          <div className="mb-12">
            <h1 className="mb-4 text-4xl leading-[1.1] font-bold tracking-tighter text-black sm:text-[56px]">
              Criar nova senha
            </h1>
            <p className="text-lg text-[#474747]">
              Sua segurança é prioridade. Escolha uma senha forte para proteger
              sua conta.
            </p>
          </div>

          <form
            onSubmit={newPwForm.handleSubmit(onNewPasswordSubmit)}
            className="space-y-8"
          >
            <div className="space-y-2">
              <label htmlFor="npw" className={labelSm}>
                Nova senha
              </label>
              <div className="relative">
                <Input
                  id="npw"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={newPwForm.formState.isSubmitting}
                  className={cn(
                    "h-auto w-full rounded-b-xl border-0 bg-[#e8e8e8] px-4 py-5 text-lg shadow-none focus-visible:ring-0",
                    "border-b-2 border-transparent focus-visible:border-[#006d33]",
                    "pr-12",
                    newPwForm.formState.errors.password &&
                      "border-b-[#ba1a1a]",
                  )}
                  {...newPwForm.register("password")}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-[#474747] hover:text-black"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPw ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
              {newPwForm.formState.errors.password && (
                <p className="text-xs text-[#ba1a1a]">
                  {newPwForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="npw2" className={labelSm}>
                Confirmar nova senha
              </label>
              <div className="relative">
                <Input
                  id="npw2"
                  type={showPw2 ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={newPwForm.formState.isSubmitting}
                  className={cn(
                    "h-auto w-full rounded-b-xl border-0 bg-[#e8e8e8] px-4 py-5 text-lg shadow-none focus-visible:ring-0",
                    "border-b-2 border-transparent focus-visible:border-[#006d33]",
                    "pr-12",
                    newPwForm.formState.errors.confirmPassword &&
                      "border-b-[#ba1a1a]",
                  )}
                  {...newPwForm.register("confirmPassword")}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-[#474747] hover:text-black"
                  onClick={() => setShowPw2((v) => !v)}
                  aria-label={
                    showPw2 ? "Ocultar confirmação" : "Mostrar confirmação"
                  }
                >
                  {showPw2 ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
              {newPwForm.formState.errors.confirmPassword && (
                <p className="text-xs text-[#ba1a1a]">
                  {newPwForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="rounded-xl border-l-4 border-[#006d33] bg-[#f3f3f3] p-6">
              <p className="mb-2 text-sm font-medium text-[#1a1c1c]">
                Requisitos de segurança:
              </p>
              <ul className="space-y-2 text-xs text-[#474747]">
                <li className="flex items-center gap-2">
                  {rules.len ? (
                    <CheckCircle2
                      className="size-3.5 shrink-0 text-[#006d33]"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <Circle
                      className="size-3.5 shrink-0 text-[#c6c6c6]"
                      strokeWidth={1.5}
                    />
                  )}
                  Mínimo de 8 caracteres
                </li>
                <li className="flex items-center gap-2">
                  {rules.symbolOrNumber ? (
                    <CheckCircle2
                      className="size-3.5 shrink-0 text-[#006d33]"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <Circle
                      className="size-3.5 shrink-0 text-[#c6c6c6]"
                      strokeWidth={1.5}
                    />
                  )}
                  Pelo menos um número ou símbolo
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                disabled={newPwForm.formState.isSubmitting}
                className="h-auto w-full rounded-lg bg-black py-5 text-lg font-bold text-white shadow-xl shadow-black/5 transition-all hover:bg-[#3b3b3b] active:scale-95"
              >
                {newPwForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-5 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Salvar nova senha"
                )}
              </Button>
            </div>
          </form>

          <div className="relative mt-20 h-32 overflow-hidden rounded-2xl bg-black">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "linear-gradient(135deg, #006d33 0%, transparent 50%), radial-gradient(circle at 80% 20%, #5adf82 0%, transparent 45%)",
              }}
              aria-hidden
            />
            <div className="relative flex h-full items-center px-8">
              <span className="text-2xl font-black tracking-tighter text-white italic">
                DRIVE SECURE.
              </span>
            </div>
            <div className="absolute top-0 right-0 h-full w-1/2 -skew-x-12 translate-x-12 bg-[#6aee8f]/10 backdrop-blur-sm" />
          </div>
        </main>
      )}

      {phase === "request" && !isNewPassword && (
        <footer className="py-8 text-center">
          <p className="text-[10px] tracking-[0.2em] text-[#c6c6c6] uppercase">
            Precision navigation • {new Date().getFullYear()}
          </p>
        </footer>
      )}
    </div>
  );
}
