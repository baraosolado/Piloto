import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { requireSession } from "@/lib/get-session";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  const [vehicle] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.userId, session.user.id))
    .limit(1);

  if (!vehicle) {
    redirect("/onboarding/veiculo");
  }

  return <AppShell>{children}</AppShell>;
}
