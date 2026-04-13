"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, "Mínimo 2 caracteres")
      .max(100, "Máximo 100 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Za-zÀ-ÿ]/, "Inclua letras")
      .regex(/[0-9]/, "Inclua números")
      .regex(/[A-ZÀ-Ÿ]/, "Inclua uma letra maiúscula"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
    lgpdConsent: z.coerce.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })
  .refine((data) => data.lgpdConsent === true, {
    message:
      "Marque a caixa para aceitar a Política de Privacidade e os Termos de Uso.",
    path: ["lgpdConsent"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

const fieldClass =
  "h-auto rounded-xl border-0 bg-[#e8e8e8] px-4 py-4 text-base text-[#1a1c1c] shadow-none placeholder:text-[#c6c6c6] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[#006d33] focus-visible:ring-offset-0 md:text-base";

const labelClass =
  "ml-1 text-[12px] font-medium tracking-widest text-[#474747] uppercase";

/** Persiste consentimento LGPD no servidor (sessão após sign-up; retentativas leves se o cookie ainda não estiver visível). */
async function recordLgpdConsentAfterSignup(): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("/api/user/lgpd-consent", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (res.ok) return true;
    if (res.status === 401 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 400));
      continue;
    }
    break;
  }
  return false;
}

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {met ? (
        <CheckCircle2
          className="size-[18px] shrink-0 text-[#006d33]"
          strokeWidth={2.25}
          aria-hidden
        />
      ) : (
        <Circle
          className="size-[18px] shrink-0 text-[#c6c6c6]"
          strokeWidth={1.5}
          aria-hidden
        />
      )}
      <span className="text-[12px] font-medium text-[#474747]">{label}</span>
    </div>
  );
}

export function CadastroForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      lgpdConsent: false,
    },
    mode: "onChange",
  });

  const password = form.watch("password");

  const rules = {
    minLen: password.length >= 8,
    upper: /[A-ZÀ-Ÿ]/.test(password),
    number: /[0-9]/.test(password),
  };

  async function onSubmit(data: SignupFormValues) {
    const result = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (result.error) {
      const msg = result.error.message?.trim();
      if (process.env.NODE_ENV === "development" && msg) {
        console.error("[cadastro] Better Auth:", result.error);
      }
      toast.error(msg ?? "Não foi possível criar a conta.");
      return;
    }

    toast.success("Conta criada!");
    if (!(await recordLgpdConsentAfterSignup())) {
      toast.error(
        "Não foi possível guardar o consentimento agora. Vá a Configurações → Conta e toque em «Registar consentimento».",
      );
    }
    router.push("/onboarding/veiculo");
    router.refresh();
  }

  const pending = form.formState.isSubmitting;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex w-full max-w-[400px] flex-col space-y-8"
    >
      <div className="space-y-2">
        <label htmlFor="name" className={labelClass}>
          Nome completo
        </label>
        <Input
          id="name"
          autoComplete="name"
          disabled={pending}
          placeholder="Seu nome"
          aria-invalid={Boolean(form.formState.errors.name)}
          className={cn(fieldClass, form.formState.errors.name && "ring-2 ring-[#ba1a1a]")}
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-xs text-[#ba1a1a]">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          disabled={pending}
          placeholder="nome@email.com"
          aria-invalid={Boolean(form.formState.errors.email)}
          className={cn(fieldClass, form.formState.errors.email && "ring-2 ring-[#ba1a1a]")}
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-[#ba1a1a]">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className={labelClass}>
          Senha
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            disabled={pending}
            placeholder="••••••••"
            className={cn(
              fieldClass,
              "pr-12",
              form.formState.errors.password && "ring-2 ring-[#ba1a1a]",
            )}
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
          <button
            type="button"
            className="absolute top-1/2 right-4 -translate-y-1/2 text-[#777777] transition-colors hover:text-black"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <EyeOff className="size-5" strokeWidth={1.5} />
            ) : (
              <Eye className="size-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
        {form.formState.errors.password && (
          <p className="text-xs text-[#ba1a1a]">
            {form.formState.errors.password.message}
          </p>
        )}
        <div className="space-y-3 pt-4">
          <PasswordRule met={rules.minLen} label="Mínimo de 8 caracteres" />
          <PasswordRule
            met={rules.upper}
            label="Pelo menos uma letra maiúscula"
          />
          <PasswordRule met={rules.number} label="Pelo menos um número" />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className={labelClass}>
          Confirmar senha
        </label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            disabled={pending}
            placeholder="••••••••"
            aria-invalid={Boolean(form.formState.errors.confirmPassword)}
            className={cn(
              fieldClass,
              "pr-12",
              form.formState.errors.confirmPassword && "ring-2 ring-[#ba1a1a]",
            )}
            {...form.register("confirmPassword")}
          />
          <button
            type="button"
            className="absolute top-1/2 right-4 -translate-y-1/2 text-[#777777] transition-colors hover:text-black"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={
              showConfirm ? "Ocultar confirmação" : "Mostrar confirmação"
            }
          >
            {showConfirm ? (
              <EyeOff className="size-5" strokeWidth={1.5} />
            ) : (
              <Eye className="size-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
        {form.formState.errors.confirmPassword && (
          <p className="text-xs text-[#ba1a1a]">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-4 pt-2">
        <label className="flex cursor-pointer items-start gap-3 text-left">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 rounded border-[#c6c6c6] accent-[#006d33]"
            disabled={pending}
            aria-invalid={Boolean(form.formState.errors.lgpdConsent)}
            {...form.register("lgpdConsent")}
          />
          <span className="text-[12px] leading-relaxed text-[#474747]">
            Li e aceito a{" "}
            <Link
              href="/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-black underline underline-offset-2"
            >
              Política de Privacidade
            </Link>{" "}
            e os{" "}
            <Link
              href="/termos"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-black underline underline-offset-2"
            >
              Termos de Uso
            </Link>
            .
          </span>
        </label>
        {form.formState.errors.lgpdConsent && (
          <p className="text-xs text-[#ba1a1a]">
            {form.formState.errors.lgpdConsent.message}
          </p>
        )}
      </div>

      <div className="space-y-6 pt-4">
        <Button
          type="submit"
          disabled={pending}
          className="flex h-auto w-full scale-100 items-center justify-center gap-2 rounded-xl bg-black py-5 text-base font-bold text-white transition-all hover:bg-black/90 hover:opacity-90 active:scale-95"
        >
          {pending ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              Criando conta…
            </>
          ) : (
            <>
              Criar conta
              <ArrowRight className="size-5" strokeWidth={2} aria-hidden />
            </>
          )}
        </Button>

        <div className="flex items-center gap-4 py-2">
          <div className="h-px flex-1 bg-[#c6c6c6]/30" />
          <span className="text-[12px] font-bold tracking-widest text-[#c6c6c6] uppercase">
            ou
          </span>
          <div className="h-px flex-1 bg-[#c6c6c6]/30" />
        </div>

        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-1 font-bold text-black transition-all hover:gap-2"
        >
          Já tenho uma conta
          <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
          Entrar
        </Link>
      </div>

      <p className="px-1 pt-4 text-center text-[11px] leading-relaxed text-[#a3a3a3]">
        O cadastro só é concluído após aceitar privacidade e termos na caixa acima
        (LGPD).
      </p>
    </form>
  );
}
