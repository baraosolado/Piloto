import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Política de privacidade do Copilote — tratamento de dados pessoais conforme a LGPD.",
};

// TODO: preencher antes do deploy — data de vigência exibida ao usuário
const LAST_UPDATED = "19 de março de 2026";

const DPO_EMAIL =
  process.env.NEXT_PUBLIC_DPO_EMAIL?.trim() || "privacidade@seudominio.com.br";

export default function PrivacidadePage() {
  return (
    <LegalLayout
      title="Política de privacidade"
      lastUpdated={LAST_UPDATED}
    >
      <p className="mt-0 text-[15px] leading-[1.8] text-[#333]">
        Esta Política descreve como o <strong>Copilote</strong> trata dados pessoais,
        em conformidade com a <strong>Lei nº 13.709/2018 (LGPD)</strong>.
      </p>

      <h2>1. Controlador dos dados</h2>
      {/* TODO: preencher antes do deploy — razão social, CNPJ, endereço e e-mail do DPO */}
      <ul>
        <li>
          <strong>Razão social:</strong> [RAZÃO SOCIAL DA EMPRESA]
        </li>
        <li>
          <strong>CNPJ:</strong> [CNPJ]
        </li>
        <li>
          <strong>Endereço:</strong> [ENDEREÇO]
        </li>
        <li>
          <strong>Encarregado de dados (DPO):</strong>{" "}
          <a href={`mailto:${DPO_EMAIL}`} className="text-[#000] underline">
            {DPO_EMAIL}
          </a>
        </li>
      </ul>

      <h2>2. Dados que coletamos</h2>
      <h3>Cadastro e autenticação</h3>
      <ul>
        <li>
          <strong>Nome</strong> e <strong>e-mail</strong>;
        </li>
        <li>
          <strong>Senha</strong> armazenada apenas como <strong>hash</strong>{" "}
          (nunca em texto puro).
        </li>
      </ul>
      <h3>Veículo e preferências</h3>
      <ul>
        <li>modelo, ano, consumo, preço de referência de combustível, odômetro;</li>
        <li>outros campos opcionais indicados no cadastro do veículo.</li>
      </ul>
      <h3>Dados financeiros inseridos por você</h3>
      <ul>
        <li>
          <strong>Corridas:</strong> valor, quilometragem, plataforma, data/hora,
          duração, observações;
        </li>
        <li>
          <strong>Gastos:</strong> categoria, valor, data, descrição, odômetro e
          litros quando aplicável.
        </li>
      </ul>
      <h3>Dados de uso e segurança</h3>
      <ul>
        <li>logs de acesso, endereço IP, tipo de navegador e dispositivo;</li>
        <li>registros necessários para prevenção a fraudes e segurança da conta.</li>
      </ul>
      <h3>Pagamentos</h3>
      <p>
        Dados de cartão e cobrança são tratados pelo <strong>Stripe</strong>. O
        Copilote <strong>não armazena</strong> número de cartão completo nem CVC.
      </p>

      <h2>3. Por que coletamos (bases legais — LGPD)</h2>
      <ul>
        <li>
          <strong>Execução de contrato ou procedimentos preliminares</strong>{" "}
          (Art. 7º, V): para criar sua conta, exibir dashboard, salvar corridas e
          gastos, aplicar limites do plano e processar assinatura Premium.
        </li>
        <li>
          <strong>Legítimo interesse</strong> (Art. 7º, IX): segurança da
          plataforma, prevenção a abuso, melhoria técnica do produto e suporte,
          sempre com balanceamento em relação à sua privacidade.
        </li>
        <li>
          <strong>Consentimento</strong> (Art. 7º, I): quando exigirmos aceite
          específico, por exemplo para <strong>comunicações de marketing</strong>{" "}
          (opt-in); você pode revogar quando permitido pela interface ou pelo
          contato com o DPO.
        </li>
        <li>
          <strong>Cumprimento de obrigação legal</strong> (Art. 7º, II), quando
          aplicável.
        </li>
      </ul>

      <h2>4. Como usamos os dados</h2>
      <ul>
        <li>calcular lucro líquido, custo por km, metas e indicadores exibidos no app;</li>
        <li>gerar relatórios em PDF e exportações (por exemplo, CSV), conforme seu plano;</li>
        <li>enviar notificações relacionadas ao serviço (ex.: alertas de manutenção, metas);</li>
        <li>melhorar o produto com estatísticas <strong>agregadas e anonimizadas</strong>;</li>
        <li>
          <strong>não vendemos</strong> seus dados pessoais a terceiros;
        </li>
        <li>
          <strong>não utilizamos</strong> seus dados para exibir publicidade de
          terceiros dentro do Copilote.
        </li>
      </ul>

      <h2>5. Compartilhamento com terceiros</h2>
      <ul>
        <li>
          <strong>Stripe</strong> — processamento de pagamentos. Política:{" "}
          <a
            href="https://stripe.com/br/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            stripe.com/privacy
          </a>
          .
        </li>
        <li>
          <strong>Sentry</strong> (quando habilitado) — monitoramento de erros, com
          dados em geral anonimizados ou mínimos necessários para depuração.
        </li>
        <li>
          <strong>Infraestrutura:</strong> servidores em <strong>VPS no Brasil</strong>,
          conforme configuração de hospedagem do controlador.
        </li>
      </ul>
      <p>
        Não compartilhamos seus dados com outros parceiros sem base legal e, quando
        necessário, <strong>consentimento explícito</strong> ou contrato adequado.
      </p>

      <h2>6. Retenção de dados</h2>
      <ul>
        <li>
          <strong>Conta ativa:</strong> mantemos os dados enquanto a conta existir e
          forem necessários para o serviço.
        </li>
        <li>
          <strong>Após exclusão da conta:</strong> eliminamos dados pessoais em até{" "}
          <strong>30 (trinta) dias</strong>, salvo obrigações legais de guarda.
        </li>
        <li>
          <strong>Logs de segurança:</strong> podem ser mantidos por até{" "}
          <strong>6 (seis) meses</strong> após a exclusão, quando necessário para
          defesa em disputas ou requisitos legais.
        </li>
        <li>
          <strong>Estatísticas anonimizadas:</strong> informações que não permitem
          identificação podem ser conservadas de forma agregada.
        </li>
      </ul>

      <h2>7. Segurança</h2>
      <ul>
        <li>senhas com algoritmo de hash (ex.: bcrypt), sem armazenamento em texto claro;</li>
        <li>tráfego criptografado via <strong>HTTPS/TLS</strong>;</li>
        <li>acesso ao banco de dados restrito à aplicação no servidor;</li>
        <li>sessões com <strong>expiração automática</strong>, conforme configuração do sistema de autenticação.</li>
      </ul>

      <h2>8. Direitos do titular (LGPD — Art. 18)</h2>
      <p>Você pode, a qualquer momento, conforme a lei:</p>
      <ul>
        <li>
          <strong>Confirmar</strong> se tratamos seus dados e acessar uma cópia;
        </li>
        <li>
          <strong>Corrigir</strong> dados incompletos ou desatualizados em{" "}
          <strong>Configurações → Perfil</strong> e <strong>Configurações →
          Veículo</strong>;
        </li>
        <li>
          <strong>Exportar</strong> seus dados em <strong>Configurações → Conta →
          Exportar meus dados</strong> (arquivo com seus registros);
        </li>
        <li>
          <strong>Eliminar</strong> dados e encerrar a conta em{" "}
          <strong>Configurações → Conta → Excluir conta</strong>;
        </li>
        <li>
          <strong>Portabilidade</strong> em formato estruturado (por exemplo, JSON
          no export ZIP e CSV onde disponível);
        </li>
        <li>
          <strong>Revogar consentimento</strong> quando o tratamento se basear nele,
          e <strong>oposição</strong> em casos de legítimo interesse, observadas as
          exceções legais.
        </li>
      </ul>
      <p>
        Para solicitações adicionais ou dúvidas sobre exercício de direitos:{" "}
        <a href={`mailto:${DPO_EMAIL}`} className="font-bold text-[#000] underline">
          {DPO_EMAIL}
        </a>{" "}
        (também utilizável como canal do encarregado).
      </p>

      <h2>9. Cookies e armazenamento local</h2>
      <ul>
        <li>
          Utilizamos <strong>cookies ou mecanismos equivalentes</strong> necessários
          para <strong>manter sua sessão de login</strong> e segurança; sem isso, o
          acesso autenticado não funciona adequadamente.
        </li>
        <li>
          <strong>Não utilizamos</strong> cookies de publicidade comportamental de
          terceiros para rastrear sua navegação fora do Copilote.
        </li>
        <li>
          <strong>Não utilizamos Google Analytics</strong> nem ferramentas análogas
          de rastreamento de terceiros descritas nesta política; alterações serão
          refletidas aqui.
        </li>
      </ul>

      <h2>10. Crianças e adolescentes</h2>
      <p>
        O Copilote <strong>não é destinado</strong> a menores de <strong>18 anos</strong>.
        Não coletamos intencionalmente dados de menores. Se tomarmos conhecimento de
        cadastro indevido, tomaremos medidas para excluir as informações.
      </p>

      <h2>11. Alterações nesta política</h2>
      <p>
        Podemos atualizar esta Política. Mudanças relevantes serão comunicadas por{" "}
        <strong>e-mail com antecedência mínima de 15 (quinze) dias</strong>, quando
        apropriado. A data de &quot;Última atualização&quot; no topo desta página
        será revisada.
      </p>

      <h2>12. Contato e DPO</h2>
      <p>
        <strong>E-mail:</strong>{" "}
        <a href={`mailto:${DPO_EMAIL}`} className="text-[#000] underline">
          {DPO_EMAIL}
        </a>
      </p>
      <p>
        <strong>Prazo de resposta:</strong> até <strong>15 (quinze) dias úteis</strong>,
        prorrogáveis uma vez, mediante justificativa, conforme a LGPD.
      </p>
      <p>
        Consulte também os <Link href="/termos">Termos de uso</Link>, que regulam a
        contratação do serviço.
      </p>
    </LegalLayout>
  );
}
