"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ChevronRight, Loader2, Lock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { authApiPost } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().min(1, "Informe o nome").max(255),
  city: z.string().max(100).optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

const fieldWrap =
  "rounded-xl bg-[#f3f3f3] p-4 transition-colors focus-within:bg-[#eeeeee]";
const labelSm =
  "mb-1 block text-[12px] font-medium tracking-widest text-[#777777] uppercase";
const inputBare =
  "h-auto border-0 bg-transparent p-0 text-lg font-semibold shadow-none focus-visible:ring-0";

type Props = {
  defaultName: string;
  defaultCity: string | null;
  email: string;
};

export function ConfiguracoesPerfilForm({
  defaultName,
  defaultCity,
  email,
}: Props) {
  const router = useRouter();
  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: defaultName,
      city: defaultCity ?? "",
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const initial = defaultName.trim().charAt(0).toUpperCase() || "?";

  async function onSaveProfile(data: ProfileValues) {
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: data.name.trim(),
        city: data.city?.trim() === "" ? null : data.city?.trim(),
      }),
    });
    const json = (await res.json()) as {
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      toast.error(json.error?.message ?? "Não foi possível salvar.");
      return;
    }
    toast.success("Perfil atualizado.");
    router.refresh();
  }

  async function onChangeEmail() {
    const parsed = z.string().email().safeParse(newEmail.trim());
    if (!parsed.success) {
      toast.error("E-mail inválido.");
      return;
    }
    if (parsed.data.toLowerCase() === email.toLowerCase()) {
      toast.error("Este já é o e-mail da sua conta.");
      return;
    }
    setEmailSubmitting(true);
    try {
      const origin = window.location.origin;
      const { ok, message } = await authApiPost("/change-email", {
        newEmail: parsed.data,
        callbackURL: `${origin}/configuracoes/perfil`,
      });
      if (!ok) {
        toast.error(message);
        return;
      }
      toast.success(
        "Enviamos um link de confirmação para o novo e-mail.",
      );
      setEmailOpen(false);
      setNewEmail("");
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function onChangePassword(data: PasswordValues) {
    const { ok, message } = await authApiPost("/change-password", {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    if (!ok) {
      toast.error(message);
      return;
    }
    toast.success("Senha alterada.");
    setPasswordOpen(false);
    passwordForm.reset();
    router.refresh();
  }

  const saving = profileForm.formState.isSubmitting;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="flex size-28 items-center justify-center rounded-full border-4 border-[#eeeeee] bg-black text-5xl font-bold text-white shadow-sm">
            {initial}
          </div>
        </div>
      </section>

      <form
        onSubmit={profileForm.handleSubmit(onSaveProfile)}
        className="space-y-4"
      >
        <div className={fieldWrap}>
          <Label htmlFor="name" className={labelSm}>
            Nome completo
          </Label>
          <Input
            id="name"
            className={cn(inputBare, "text-black")}
            disabled={saving}
            {...profileForm.register("name")}
          />
          <div className="mt-2 h-px w-full bg-[#c6c6c6]/30" />
          {profileForm.formState.errors.name && (
            <p className="mt-1 text-xs text-destructive">
              {profileForm.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className={cn(fieldWrap, "flex items-center justify-between gap-4")}>
          <div className="min-w-0 flex-1">
            <Label className={labelSm}>E-mail</Label>
            <p className="truncate text-lg font-semibold text-black/60 italic">
              {email}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="shrink-0 font-bold text-[#006d33] hover:underline"
            onClick={() => setEmailOpen(true)}
          >
            Alterar e-mail
          </Button>
        </div>

        <div className={fieldWrap}>
          <Label htmlFor="city" className={labelSm}>
            Cidade
          </Label>
          <div className="flex items-center gap-2">
            <MapPin className="size-5 shrink-0 text-[#777777]" aria-hidden />
            <Input
              id="city"
              className={cn(inputBare, "flex-1 text-black")}
              placeholder="São Paulo, SP"
              disabled={saving}
              {...profileForm.register("city")}
            />
          </div>
          <div className="mt-2 h-px w-full bg-[#c6c6c6]/30" />
        </div>

        <section className="space-y-4 pt-2">
          <h3 className="text-xl font-bold tracking-tight">Segurança</h3>
          <button
            type="button"
            className="group flex w-full items-center justify-between rounded-xl bg-[#e2e2e2] p-5 transition-colors hover:bg-[#e8e8e8]"
            onClick={() => setPasswordOpen(true)}
          >
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-black/5">
                <Lock className="size-5 text-black" aria-hidden />
              </div>
              <span className="font-bold text-black">Alterar senha</span>
            </div>
            <ChevronRight className="size-5 text-[#777777] transition-transform group-hover:translate-x-1" />
          </button>
        </section>

        <Button
          type="submit"
          disabled={saving}
          className="h-auto w-full rounded-xl py-5 text-lg font-bold shadow-lg"
        >
          {saving ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            "Salvar alterações"
          )}
        </Button>
      </form>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar e-mail</DialogTitle>
            <DialogDescription>
              Enviaremos um link de confirmação para o novo endereço. O e-mail
              atual continua ativo até você confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-email">Novo e-mail</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="novo@email.com"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onChangeEmail} disabled={emailSubmitting}>
              {emailSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Enviar confirmação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>
              Use uma senha forte com pelo menos 8 caracteres.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={passwordForm.handleSubmit(onChangePassword)}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="cur-pw">Senha atual</Label>
              <Input
                id="cur-pw"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register("currentPassword")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">Nova senha</Label>
              <Input
                id="new-pw"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("newPassword")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf-pw">Confirmar nova senha</Label>
              <Input
                id="conf-pw"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("confirmPassword")}
              />
            </div>
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {passwordForm.formState.errors.confirmPassword.message}
              </p>
            )}
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Salvar senha"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
