import { ConfiguracoesPlataformasClient } from "@/components/configuracoes/configuracoes-plataformas-client";
import { ConfiguracoesSubpageHeader } from "@/components/configuracoes/configuracoes-subpage-header";

export default function ConfiguracoesPlataformasPage() {
  return (
    <div>
      <ConfiguracoesSubpageHeader title="Plataformas" />
      <ConfiguracoesPlataformasClient />
    </div>
  );
}
