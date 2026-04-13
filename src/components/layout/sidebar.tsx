"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Car,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";
import {
  MaintenanceNavIndicator,
} from "@/components/layout/maintenance-nav-indicator";
import { useMaintenanceAlerts } from "@/components/layout/maintenance-alerts-context";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/corridas", label: "Corridas", icon: Car },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/inteligencia", label: "Inteligência", icon: TrendingUp },
  { href: "/manutencao", label: "Manutenção", icon: Wrench },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
] as const;

const settingsHref = "/configuracoes" as const;
const settingsRoot = "/configuracoes" as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const maintenanceAlerts = useMaintenanceAlerts();
  const { data } = authClient.useSession();
  const user = data?.user;
  const displayName =
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "Motorista";
  const initial = displayName.charAt(0).toUpperCase() || "?";
  const planLabel = "FREE";

  return (
    <aside
      className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col bg-[#000000] text-white md:flex"
      aria-label="Navegação principal"
    >
      <div className="flex shrink-0 items-center px-4 pt-6 pb-4">
        <span className="text-[20px] font-bold leading-none text-white">
          Copilote
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          const maintCount =
            maintenanceAlerts.overdue + maintenanceAlerts.warning;
          const isManutencao = href === "/manutencao";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-2 py-3 px-4 text-sm font-medium text-white transition-colors",
                active
                  ? "border-white bg-[#1a1a1a]"
                  : "border-transparent hover:bg-[#111111]",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {isManutencao && maintCount > 0 ? (
                <span className="sr-only">
                  {maintenanceAlerts.overdue > 0
                    ? `${maintCount} alertas de manutenção, há itens atrasados ou próximos do prazo`
                    : `${maintCount} manutenções próximas do prazo`}
                </span>
              ) : null}
              {isManutencao ? <MaintenanceNavIndicator /> : null}
            </Link>
          );
        })}

        <div className="py-2">
          <Separator className="bg-white/15" />
        </div>

        {(() => {
          const active =
            pathname === settingsRoot ||
            pathname.startsWith(`${settingsRoot}/`);
          return (
            <Link
              href={settingsHref}
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-2 py-3 px-4 text-sm font-medium text-white transition-colors",
                active
                  ? "border-white bg-[#1a1a1a]"
                  : "border-transparent hover:bg-[#111111]"
              )}
            >
              <Settings className="size-5 shrink-0" aria-hidden />
              Configurações
            </Link>
          );
        })()}
      </nav>

      <div className="mt-auto shrink-0 border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-black"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {displayName}
            </p>
            <Badge
              variant="secondary"
              className="mt-1 h-5 border-0 bg-white/15 px-2 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-white/20"
            >
              {planLabel}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
