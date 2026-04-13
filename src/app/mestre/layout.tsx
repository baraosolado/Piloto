import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MestreHeader } from "@/components/mestre/mestre-header";
import { INTERNAL_ADMIN_BASE_PATH } from "@/lib/internal-admin-path";

const SUPER_ADMIN = "super_admin";

export default async function MestreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(INTERNAL_ADMIN_BASE_PATH)}`,
    );
  }

  const sess = session.session as { impersonatedBy?: string | null };
  if (sess.impersonatedBy) {
    notFound();
  }

  const role = (session.user as { role?: string }).role;
  if (role !== SUPER_ADMIN) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
      <MestreHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">{children}</div>
      <footer className="border-t border-zinc-200/80 bg-white py-6 text-center text-xs text-zinc-500">
        Área restrita ·{" "}
        <Link href="/configuracoes" className="font-medium text-[#006d33] hover:underline">
          Voltar às configurações
        </Link>
      </footer>
    </div>
  );
}
