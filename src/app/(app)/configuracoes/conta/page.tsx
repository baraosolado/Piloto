import { ConfiguracoesContaClient } from "@/components/configuracoes/configuracoes-conta-client";
import { ConfiguracoesSubpageHeader } from "@/components/configuracoes/configuracoes-subpage-header";

export default function ConfiguracoesContaPage() {
  return (
    <div>
      <ConfiguracoesSubpageHeader title="Conta" />
      <ConfiguracoesContaClient />
    </div>
  );
}
