import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "Termos de uso do Copilote — serviço de controle financeiro para motoristas de aplicativo.",
};

// TODO: preencher antes do deploy — data de vigência exibida ao usuário
const LAST_UPDATED = "19 de março de 2026";

export default function TermosPage() {
  return (
    <LegalLayout title="Termos de uso" lastUpdated={LAST_UPDATED}>
      <h2>1. Sobre o Copilote</h2>
      <p>
        O <strong>Copilote</strong> é um serviço online (SaaS) de organização e
        visualização financeira voltado a <strong>motoristas de aplicativo</strong>{" "}
        (como Uber, 99, inDrive e trabalho particular registrado na plataforma),
        que permite registrar corridas e gastos, acompanhar indicadores e gerar
        relatórios para apoio à decisão pessoal.
      </p>
      <p>
        O uso do Copilote é permitido apenas a <strong>pessoas físicas maiores de
        18 anos</strong>, com capacidade civil para contratar.
      </p>
      <p>
        <strong>Empresa responsável pelo serviço:</strong>
      </p>
      {/* TODO: preencher antes do deploy — razão social, CNPJ e endereço */}
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
      </ul>

      <h2>2. Cadastro e conta</h2>
      <p>Para criar uma conta, você informa, no mínimo:</p>
      <ul>
        <li>nome;</li>
        <li>endereço de e-mail válido;</li>
        <li>senha de acesso.</li>
      </ul>
      <p>
        Você é responsável por manter a <strong>senha em sigilo</strong> e por
        todas as atividades realizadas na sua conta. Não é permitido{" "}
        <strong>compartilhar a conta</strong> com terceiros nem permitir acesso
        por pessoas não autorizadas.
      </p>
      <p>
        As informações cadastradas devem ser <strong>verdadeiras e atualizadas</strong>.
        Dados falsos ou enganosos podem ensejar suspensão ou encerramento da conta.
      </p>

      <h2>3. Planos e pagamento</h2>
      <h3>Plano gratuito</h3>
      <p>Inclui, entre outras condições:</p>
      <ul>
        <li>até <strong>50 corridas</strong> registradas por mês;</li>
        <li>até <strong>20 gastos</strong> registrados por mês;</li>
        <li>demais limites descritos na interface do produto.</li>
      </ul>
      <h3>Plano Premium</h3>
      <p>
        O plano pago inclui <strong>7 (sete) dias de uso gratuito</strong> para
        novas assinaturas; após esse período, a cobrança é feita de forma recorrente
        no cartão, conforme a modalidade escolhida: <strong>cerca de R$ 12,90 por
        mês</strong> (plano mensal) ou <strong>valor anual promocional</strong>{" "}
        (plano anual com desconto em relação a doze mensalidades cheias), nos termos
        exibidos no momento da contratação e processados pelo Stripe.
      </p>
      <h3>Cancelamento</h3>
      <p>
        Você pode <strong>cancelar a assinatura a qualquer momento</strong> pelas
        ferramentas indicadas no aplicativo (por exemplo, portal de cobrança ou
        configurações de plano). O acesso às funcionalidades Premium permanece até
        o fim do <strong>período já pago</strong>.
      </p>
      <h3>Reembolso</h3>
      <p>
        Não há reembolso de valores referentes a <strong>períodos já cobrados e
        utilizados</strong>, salvo disposição legal obrigatória em contrário.
      </p>
      <h3>Processador de pagamento</h3>
      <p>
        Os pagamentos são processados pelo <strong>Stripe</strong>. O Copilote{" "}
        <strong>não armazena</strong> o número completo do cartão nem os dados
        sensíveis de pagamento; esses dados são tratados conforme a política do
        Stripe.
      </p>

      <h2>4. Uso do serviço</h2>
      <p>
        O Copilote é uma <strong>ferramenta de organização financeira pessoal</strong>.
        Os dados de corridas e gastos são <strong>inseridos manualmente</strong> por
        você — <strong>não há integração automática</strong> com Uber, 99, inDrive
        ou outras plataformas.
      </p>
      <p>
        Relatórios, gráficos e números exibidos <strong>não substituem</strong>{" "}
        documentação contábil, fiscal ou trabalhista oficial, nem parecer de
        contador ou assessor jurídico.
      </p>
      <p>É proibido:</p>
      <ul>
        <li>usar o serviço para fins ilegais ou violação de direitos de terceiros;</li>
        <li>tentar acesso não autorizado a sistemas, contas ou dados de outros usuários;</li>
        <li>realizar engenharia reversa, descompilar ou extrair código-fonte salvo quando permitido por lei;</li>
        <li>sobrecarregar ou prejudicar a infraestrutura do serviço de forma dolosa.</li>
      </ul>

      <h2>5. Responsabilidade e limitações</h2>
      <p>
        O Copilote <strong>não presta assessoria financeira profissional</strong> e
        não garante resultado econômico ou lucratividade. Decisões tomadas com base
        nas informações do aplicativo são de <strong>sua exclusiva
        responsabilidade</strong>.
      </p>
      <p>
        Empregamos esforços para manter o serviço disponível. Uma meta interna de
        disponibilidade pode ser de até <strong>99,5% de uptime</strong>, sem que
        isso constitua garantia contratual vinculante, em especial no{" "}
        <strong>plano gratuito</strong>, onde o serviço é oferecido &quot;no estado
        em que se encontra&quot;.
      </p>

      <h2>6. Propriedade intelectual</h2>
      <p>
        O nome, marca, layout, textos da interface, código e demais elementos do
        Copilote, salvo conteúdo de terceiros, são de propriedade da empresa ou de
        seus licenciadores. É vedada a cópia não autorizada para fins comerciais.
      </p>
      <p>
        Os <strong>dados que você insere</strong> (corridas, gastos, configurações)
        permanecem de sua titularidade, nos termos da{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>7. Alterações nos termos</h2>
      <p>
        Podemos atualizar estes Termos. Alterações relevantes serão comunicadas por{" "}
        <strong>e-mail com antecedência mínima de 15 (quinze) dias</strong>, quando
        exigido ou recomendável. O <strong>uso continuado</strong> do serviço após
        a data de vigência das novas condições importa em <strong>aceite</strong>{" "}
        dos termos atualizados, salvo direito de encerrar a conta.
      </p>

      <h2>8. Vigência e rescisão</h2>
      <p>
        Você pode <strong>encerrar sua conta a qualquer momento</strong> em{" "}
        <strong>Configurações → Conta</strong>, conforme as opções disponíveis na
        interface.
      </p>
      <p>
        A empresa pode <strong>suspender ou encerrar</strong> contas que violem estes
        Termos, a legislação aplicável ou que representem risco à segurança do
        serviço ou de terceiros, mediante comunicação quando possível.
      </p>

      <h2>9. Foro</h2>
      {/* TODO: preencher antes do deploy — comarca e UF */}
      <p>
        Fica eleito o foro da comarca de <strong>[CIDADE] — [ESTADO]</strong>,
        Brasil, para dirimir questões oriundas destes Termos, com renúncia a qualquer
        outro, por mais privilegiado que seja. Aplica-se a <strong>legislação
        brasileira</strong>.
      </p>

      <h2>10. Contato</h2>
      {/* TODO: preencher antes do deploy — e-mail de suporte */}
      <p>
        Dúvidas sobre estes Termos: <strong>[EMAIL DE SUPORTE]</strong>
      </p>
      <p>
        Para tratamento de dados pessoais, consulte também a{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
    </LegalLayout>
  );
}
