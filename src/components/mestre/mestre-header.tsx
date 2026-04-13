"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users } from "lucide-react";
import { INTERNAL_ADMIN_BASE_PATH } from "@/lib/internal-admin-path";
import { cn } from "@/lib/utils";

const nav = [
  {
    href: INTERNAL_ADMIN_BASE_PATH,
    label: "Visão geral",
    icon: LayoutDashboard,
    match: (p: string) => p === INTERNAL_ADMIN_BASE_PATH,
  },
  {
    href: `${INTERNAL_ADMIN_BASE_PATH}/usuarios`,
    label: "Utilizadores",
    icon: Users,
    match: (p: string) => p.startsWith(`${INTERNAL_ADMIN_BASE_PATH}/usuarios`),
  },
] as const;

export function MestreHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black text-sm font-black tracking-tight text-white">
            C
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#006d33]">
              Copilote
            </p>
            <p className="text-lg font-bold tracking-tight text-zinc-900">
              Administração
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {nav.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                {label}
              </Link>
            );
          })}
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            Abrir app (motorista)
          </Link>
        </nav>
      </div>
    </header>
  );
}
