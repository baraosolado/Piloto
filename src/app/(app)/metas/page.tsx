import { MetasView } from "@/components/metas/metas-view";
import { getMetasPageData } from "@/lib/metas-page-data";
import { requireSession } from "@/lib/get-session";

export default async function MetasPage() {
  const session = await requireSession();
  const data = await getMetasPageData(session.user.id);

  return <MetasView initialData={data} />;
}
