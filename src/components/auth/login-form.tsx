"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

const labelClass =
  "ml-1 block text-[12px] font-bold tracking-widest text-black uppercase";

const fieldClass =
  "h-auto w-full rounded-b-lg border-0 border-b-2 border-transparent bg-[#e8e8e8] px-4 py-4 text-base text-[#1a1c1c] shadow-none transition-all placeholder:text-[#c6c6c6] focus-visible:border-[#006d33] focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base";

function isRateLimitError(error: { status?: number; message?: string } | null) {
  if (!error) return false;
  if (error.status === 429) return true;
  const m = (error.message ?? "").toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("too many") ||
    m.includes("muitas requisições")
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  async function onSubmit(data: LoginFormValues) {
    const result = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (result.error) {
      if (isRateLimitError(result.error)) {
        toast.error("Muitas tentativas. Aguarde 15 minutos.");
      } else {
        toast.error("Email ou senha incorretos");
      }
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl");
    const safe =
      callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/dashboard";
    router.push(safe);
    router.refresh();
  }

  const pending = form.formState.isSubmitting;

  return (
    <div className="w-full">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-8"
      >
        <div className="space-y-2">
          <label htmlFor="login-email" className={labelClass}>
            Email
          </label>
          <div className="relative">
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              disabled={pending}
              placeholder="nome@exemplo.com"
              aria-invalid={Boolean(form.formState.errors.email)}
              className={cn(
                fieldClass,
                form.formState.errors.email && "border-b-[#ba1a1a]",
              )}
              {...form.register("email")}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-[#ba1a1a]">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="login-password" className={labelClass}>
            Senha
          </label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              disabled={pending}
              placeholder="••••••••"
              className={cn(
                fieldClass,
                "pr-12",
                form.formState.errors.password && "border-b-[#ba1a1a]",
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
          <div className="flex justify-end">
            <Link
              href="/recuperar-senha"
              className="text-xs font-bold text-black underline decoration-[#c6c6c6] underline-offset-4 transition-colors hover:text-[#006d33]"
            >
              Esqueci minha senha
            </Link>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-[#ba1a1a]">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={pending}
            className="flex h-auto w-full items-center justify-center rounded-lg bg-black py-5 text-lg font-bold text-white shadow-xl shadow-black/5 transition-all hover:bg-black/90 hover:opacity-90 active:scale-[0.98]"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </div>
      </form>

      <div className="mt-12 text-center">
        <p className="text-sm text-[#777777]">
          Não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-bold text-black underline-offset-4 hover:underline"
          >
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
