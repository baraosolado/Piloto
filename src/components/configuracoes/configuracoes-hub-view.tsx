"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Car,
  ChevronRight,
  CreditCard,
  Headset,
  LogOut,
  User,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const menuItems: {
  href: string;
  label: string;
  icon: typeof User;
  iconClass?: string;
}[] = [
  { href: "/configuracoes/perfil", label: "Perfil", icon: User },
  { href: "/configuracoes/veiculo", label: "Veículo", icon: Car },
  {
    href: "/configuracoes/plano",
    label: "Plano e Pagamento",
    icon: CreditCard,
    iconClass: "text-[#006d33]",
  },
  { href: "/configuracoes/conta", label: "Conta", icon: UserCircle },
];

type Props = {
  displayName: string;
  subtitle: string;
  appVersion: string;
};

export function ConfiguracoesHubView({
  displayName,
  subtitle,
  appVersion,
}: Props) {
  const router = useRouter();
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative w-full">
      <header className="sticky top-0 z-20 -mx-6 mb-6 border-b border-zinc-200/60 bg-zinc-50/95 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-50/85">
        <div className="mx-auto flex h-12 max-w-xl items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex size-10 items-center justify-center rounded-full text-black transition-transform hover:bg-zinc-200 active:scale-95"
              aria-label="Voltar ao início"
            >
              <ArrowLeft className="size-6" strokeWidth={2} />
            </Link>
            <h1 className="font-sans text-xl font-bold tracking-tight text-black md:text-2xl">
              Configurações
            </h1>
          </div>
          <div className="w-10 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl pt-2">
        <div className="mb-8 flex items-center gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200/60">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eeeeee] text-2xl font-bold text-black">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-[#1a1c1c]">
              {displayName}
            </p>
            <p className="text-sm text-[#777777]">{subtitle}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-[#f3f3f3] p-[2px]">
          <div className="flex flex-col gap-[2px]">
          {menuItems.map(({ href, label, icon: Icon, iconClass }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between bg-white p-5 transition-colors hover:bg-zinc-100"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eeeeee]">
                  <Icon
                    className={`size-5 text-black ${iconClass ?? ""}`}
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
                <span className="font-semibold text-[#1a1c1c]">{label}</span>
              </div>
              <ChevronRight
                className="size-5 text-[#777777] transition-transform group-hover:translate-x-1"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          ))}

          <button
            type="button"
            className="group flex w-full items-center justify-between bg-white p-5 text-left transition-colors hover:bg-zinc-100"
            onClick={() => toast.info("Notificações em breve.")}
          >
            <div className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eeeeee]">
                <Bell className="size-5 text-black" strokeWidth={2} aria-hidden />
              </div>
              <span className="font-semibold text-[#1a1c1c]">Notificações</span>
            </div>
            <ChevronRight
              className="size-5 text-[#777777] transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </button>

          <button
            type="button"
            className="group flex w-full items-center justify-between bg-white p-5 text-left transition-colors hover:bg-zinc-100"
            onClick={() => toast.info("Suporte em breve. Use o e-mail de contato do site.")}
          >
            <div className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eeeeee]">
                <Headset className="size-5 text-black" strokeWidth={2} aria-hidden />
              </div>
              <span className="font-semibold text-[#1a1c1c]">Suporte</span>
            </div>
            <ChevronRight
              className="size-5 text-[#777777] transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </button>
          </div>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white p-5 font-bold text-[#ba1a1a] shadow-sm ring-1 ring-zinc-200/60 transition-all hover:bg-red-50 active:scale-[0.98]"
          >
            <LogOut className="size-5" strokeWidth={2} aria-hidden />
            Sair
          </button>
        </div>

        <div className="mt-12 pb-8 text-center">
          <p className="text-xs font-medium tracking-widest text-[#777777] uppercase">
            Piloto v{appVersion}
          </p>
        </div>
      </main>
    </div>
  );
}
