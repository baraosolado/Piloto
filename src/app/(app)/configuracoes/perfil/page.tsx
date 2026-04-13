import { eq } from "drizzle-orm";
import { getRequestDb } from "@/db/request-db";
import { users } from "@/db/schema";
import { ConfiguracoesPerfilForm } from "@/components/configuracoes/configuracoes-perfil-form";
import { ConfiguracoesSubpageHeader } from "@/components/configuracoes/configuracoes-subpage-header";
import { requireSession } from "@/lib/get-session";
import { loadForAppUser } from "@/lib/load-for-app-user";

export default async function ConfiguracoesPerfilPage() {
  const session = await requireSession();
  const row = await loadForAppUser(session.user.id, async () => {
    const [r] = await getRequestDb()
      .select({
        name: users.name,
        city: users.city,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    return r ?? null;
  });

  if (!row) {
    return <p className="text-sm text-muted-foreground">Usuário não encontrado.</p>;
  }

  return (
    <div>
      <ConfiguracoesSubpageHeader title="Perfil" />
      <ConfiguracoesPerfilForm
        defaultName={row.name}
        defaultCity={row.city}
        email={row.email}
      />
    </div>
  );
}
