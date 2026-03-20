import { AppHeader } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-col md:pl-[240px]">
        <AppHeader />
        <main className="flex-1 bg-muted px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
