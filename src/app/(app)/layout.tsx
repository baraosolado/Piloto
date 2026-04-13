import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getRequestDb } from "@/db/request-db";
import { vehicles } from "@/db/schema";
import { requireSession } from "@/lib/get-session";
import { loadForAppUser } from "@/lib/load-for-app-user";
import { getMaintenanceAlertCounts } from "@/lib/maintenance-alert-badge";
import { isAccountLockedWithoutSubscription } from "@/lib/plan-limits";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();
  const isImpersonating = Boolean(
    (session.session as { impersonatedBy?: string | null } | undefined)
      ?.impersonatedBy,
  );

  if (!isImpersonating) {
    const pathname =
      (await headers()).get("x-copilote-pathname") ?? "";
    const locked = await loadForAppUser(session.user.id, () =>
      isAccountLockedWithoutSubscription(
        session.user.id,
        session.user.email ?? null,
      ),
    );
    if (locked && pathname) {
      const allowed =
        pathname.startsWith("/configuracoes") ||
        pathname.startsWith("/onboarding") ||
        pathname === "/planos" ||
        pathname.startsWith("/planos/");
      if (!allowed) {
        redirect("/configuracoes/plano?bloqueado=1");
      }
    }
  }

  const maintenanceAlertsInitial = await loadForAppUser(
    session.user.id,
    async () => {
      const [vehicle] = await getRequestDb()
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(eq(vehicles.userId, session.user.id))
        .limit(1);

      if (!vehicle && !isImpersonating) {
        redirect("/onboarding/veiculo");
      }

      return getMaintenanceAlertCounts(session.user.id);
    },
  );

  return (
    <AppShell
      maintenanceAlertsInitial={maintenanceAlertsInitial}
      isImpersonating={isImpersonating}
    >
      {children}
    </AppShell>
  );
}
