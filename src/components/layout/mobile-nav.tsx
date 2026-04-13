"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Car,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useMaintenanceAlerts } from "@/components/layout/maintenance-alerts-context";
import {
  MaintenanceMenuButtonDot,
  MaintenanceNavIndicator,
} from "@/components/layout/maintenance-nav-indicator";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const barItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/corridas", label: "Corridas", icon: Car },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/metas", label: "Metas", icon: Target },
] as const;

const sheetNavSections: {
  title: string;
  items: { href: string; label: string; icon: LucideIcon }[];
}[] = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/corridas", label: "Corridas", icon: Car },
      { href: "/gastos", label: "Gastos", icon: Receipt },
      { href: "/inteligencia", label: "Inteligência", icon: TrendingUp },
      { href: "/manutencao", label: "Manutenção", icon: Wrench },
      { href: "/metas", label: "Metas", icon: Target },
      { href: "/relatorios", label: "Relatórios", icon: FileText },
      { href: "/configuracoes/plano", label: "Plano e pagamento", icon: CreditCard },
    ],
  },
  {
    title: "Configurações",
    items: [
      { href: "/configuracoes", label: "Todas as configurações", icon: Settings },
    ],
  },
];

function barItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function sheetLinkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const maintenanceAlerts = useMaintenanceAlerts();
  const { data } = authClient.useSession();
  const user = data?.user;
  const displayName =
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "Motorista";

  return (
    <Sheet>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch justify-around border-t border-[#EEEEEE] bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Navegação inferior"
      >
        {barItems.map(({ href, label, icon: Icon }) => {
          const active = barItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px]",
                active
                  ? "font-bold text-black"
                  : "font-medium text-[#888888]"
              )}
            >
              <Icon
                className={cn("size-6", active ? "text-black" : "text-[#888888]")}
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}

        <SheetTrigger asChild>
          <button
            type="button"
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-[#888888]"
          >
            <MaintenanceMenuButtonDot />
            <Menu className="size-6 text-[#888888]" strokeWidth={1.75} aria-hidden />
            <span className="truncate">Menu</span>
            {maintenanceAlerts.overdue + maintenanceAlerts.warning > 0 ? (
              <span className="sr-only">
                Há alertas de manutenção; abra o menu para ver Manutenção
              </span>
            ) : null}
          </button>
        </SheetTrigger>
      </nav>

      <SheetContent
        side="left"
        className="flex w-[min(100%,320px)] flex-col border-[#EEEEEE] p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-[#EEEEEE] px-4 py-4 text-left">
          <SheetTitle className="text-lg">Menu</SheetTitle>
          <p className="text-sm font-normal text-[#888888]">{displayName}</p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-2 py-4">
          {sheetNavSections.map((section) => (
            <div key={section.title} className="mb-6 last:mb-0">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[#888888]">
                {section.title}
              </p>
              <nav className="flex flex-col gap-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = sheetLinkActive(pathname, href);
                  const isManutencao = href === "/manutencao";
                  const maintCount =
                    maintenanceAlerts.overdue + maintenanceAlerts.warning;
                  return (
                    <SheetClose key={href} asChild>
                      <Link
                        href={href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg py-3 px-3 text-sm transition-colors",
                          active
                            ? "bg-[#F6F6F6] font-bold text-black"
                            : "font-medium text-[#888888] hover:bg-[#F6F6F6]/80",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-5 shrink-0",
                            active ? "text-black" : "text-[#888888]",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {isManutencao && maintCount > 0 ? (
                          <span className="sr-only">
                            {maintenanceAlerts.overdue > 0
                              ? `${maintCount} alertas, há itens atrasados ou próximos`
                              : `${maintCount} manutenções próximas`}
                          </span>
                        ) : null}
                        {isManutencao ? (
                          <MaintenanceNavIndicator className="!ml-0" />
                        ) : null}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
