import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ConfiguracoesPerfilForm } from "@/components/configuracoes/configuracoes-perfil-form";
import { ConfiguracoesSubpageHeader } from "@/components/configuracoes/configuracoes-subpage-header";
import { requireSession } from "@/lib/get-session";

export default async function ConfiguracoesPerfilPage() {
  const session = await requireSession();
  const [row] = await db
    .select({
      name: users.name,
      city: users.city,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

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
