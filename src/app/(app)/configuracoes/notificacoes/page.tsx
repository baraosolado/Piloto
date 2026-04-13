import { NotificacoesSettingsClient } from "@/components/configuracoes/notificacoes-settings-client";
import { ConfiguracoesSubpageHeader } from "@/components/configuracoes/configuracoes-subpage-header";

export default function ConfiguracoesNotificacoesPage() {
  return (
    <div>
      <ConfiguracoesSubpageHeader title="Notificações" />
      <NotificacoesSettingsClient />
    </div>
  );
}
