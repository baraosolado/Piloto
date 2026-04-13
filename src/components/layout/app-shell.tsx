import { AppHeader } from "@/components/layout/app-header";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { MaintenanceAlertsProvider } from "@/components/layout/maintenance-alerts-context";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ServiceWorkerRegister } from "@/components/push/service-worker-register";
import { Sidebar } from "@/components/layout/sidebar";
import type { MaintenanceAlertCounts } from "@/lib/maintenance-alert-badge";
import { IMPERSONATION_BAR_HEIGHT_REM } from "@/lib/impersonation-layout";

export function AppShell({
  children,
  maintenanceAlertsInitial,
  isImpersonating = false,
}: {
  children: React.ReactNode;
  maintenanceAlertsInitial: MaintenanceAlertCounts;
  isImpersonating?: boolean;
}) {
  const barHeightStyle = { height: `${IMPERSONATION_BAR_HEIGHT_REM}rem` } as const;

  return (
    <MaintenanceAlertsProvider initial={maintenanceAlertsInitial}>
      <div className="min-h-screen bg-muted">
        <ServiceWorkerRegister />
        <Sidebar />
        <div className="flex min-h-screen flex-col md:pl-[240px]">
          {isImpersonating ? (
            <div
              className="shrink-0"
              style={barHeightStyle}
              aria-hidden
            />
          ) : null}
          <ImpersonationBanner barHeightRem={IMPERSONATION_BAR_HEIGHT_REM} />
          <AppHeader stickyTopRem={isImpersonating ? IMPERSONATION_BAR_HEIGHT_REM : 0} />
          <main className="flex-1 bg-muted px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-6">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </MaintenanceAlertsProvider>
  );
}
