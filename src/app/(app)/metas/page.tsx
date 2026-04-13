import { MetasView } from "@/components/metas/metas-view";
import { getMetasPageData } from "@/lib/metas-page-data";
import { requireSession } from "@/lib/get-session";
import { loadForAppUser } from "@/lib/load-for-app-user";

export default async function MetasPage() {
  const session = await requireSession();
  const data = await loadForAppUser(session.user.id, () =>
    getMetasPageData(session.user.id),
  );

  return <MetasView initialData={data} />;
}
