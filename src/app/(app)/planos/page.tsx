import { redirect } from "next/navigation";

/** URL legada: plano e pagamento ficam em Configurações. */
export default function PlanosPage() {
  redirect("/configuracoes/plano");
}
