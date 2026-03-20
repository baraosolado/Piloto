import { Resend } from "resend";

const APP_NAME = "Piloto";

function getFromAddress(): string {
  const raw =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "noreply@piloto.app.br";
  return `${APP_NAME} <${raw}>`;
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://piloto.app.br"
  );
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function formatResendApiError(error: unknown): string {
  if (error == null) return "erro desconhecido";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Resend (chave de teste): só entrega para o e-mail dono da conta; outros destinos retornam 403. */
function resendTestingModeUserMessage(error: unknown): string | null {
  if (error === null || typeof error !== "object") return null;
  const o = error as {
    statusCode?: number;
    name?: string;
    message?: string;
  };
  const msg = o.message ?? "";
  const looksLikeTestingLimit =
    o.statusCode === 403 &&
    (o.name === "validation_error" ||
      /only send testing emails/i.test(msg) ||
      /verify a domain/i.test(msg));
  if (!looksLikeTestingLimit) return null;

  const accountEmail =
    msg.match(/\(([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\)/)?.[1] ??
    null;

  const who = accountEmail
    ? `o e-mail da sua conta na Resend (${accountEmail})`
    : "o e-mail da sua conta na Resend";

  return (
    `No plano de testes da Resend você só pode enviar para ${who}. ` +
    "O Piloto manda a confirmação de troca de e-mail para o endereço atual da conta logada — se for outro Gmail, a Resend bloqueia (403). " +
    "Soluções: entrar no Piloto com o mesmo e-mail da conta Resend, ou verificar um domínio em resend.com/domains e usar RESEND_FROM_EMAIL desse domínio."
  );
}

/**
 * Em `development`, só simula envio se não houver `RESEND_API_KEY` (log no terminal).
 * Com a chave definida, a Resend é chamada também em dev — aparece no painel e na caixa de entrada.
 */
function devBypassWithoutResendKey(log: () => void): { id: string } | undefined {
  if (process.env.NODE_ENV !== "development") return undefined;
  if (getResend()) return undefined;
  log();
  return { id: "dev-mode" };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Recuperação de senha ────────────────────────────────────────────────────

export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
}: {
  to: string;
  name: string;
  resetLink: string;
}): Promise<{ id: string } | undefined> {
  const bypass = devBypassWithoutResendKey(() => {
    console.log(
      "\n📧 [DEV] Recuperação de senha — RESEND_API_KEY ausente; e-mail não enviado.",
    );
    console.log("Para:", to);
    console.log("Link:", resetLink);
    console.log("Defina RESEND_API_KEY no .env.local para enviar de verdade.\n");
  });
  if (bypass) return bypass;

  const resend = getResend();
  if (!resend) {
    console.error("[Resend] RESEND_API_KEY ausente — não foi possível enviar recuperação de senha.");
    throw new Error("Falha ao enviar e-mail de recuperação de senha");
  }

  const appUrl = getAppUrl();
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: "Redefinir sua senha — Piloto",
    html: passwordResetTemplate({
      name,
      resetLink,
      appUrl,
    }),
  });

  if (error) {
    console.error("[Resend] Erro ao enviar e-mail de recuperação:", error);
    throw new Error(
      resendTestingModeUserMessage(error) ??
        `Falha ao enviar recuperação de senha: ${formatResendApiError(error)}`,
    );
  }

  return data ?? undefined;
}

// ─── Verificação de e-mail (estrutura — habilitar com requireEmailVerification) ─

export async function sendVerificationEmailMessage({
  to,
  name,
  verificationLink,
}: {
  to: string;
  name: string;
  verificationLink: string;
}): Promise<{ id: string } | undefined> {
  const bypass = devBypassWithoutResendKey(() => {
    console.log(
      "\n📧 [DEV] Verificação de e-mail — RESEND_API_KEY ausente; e-mail não enviado.",
    );
    console.log("Para:", to);
    console.log("Link:", verificationLink);
    console.log("Defina RESEND_API_KEY no .env.local para enviar de verdade.\n");
  });
  if (bypass) return bypass;

  const resend = getResend();
  if (!resend) {
    console.error("[Resend] RESEND_API_KEY ausente — não foi possível enviar verificação.");
    throw new Error("Falha ao enviar e-mail de verificação");
  }

  const appUrl = getAppUrl();
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: "Confirme seu e-mail — Piloto",
    html: verificationEmailTemplate({
      name,
      verificationLink,
      appUrl,
    }),
  });

  if (error) {
    console.error("[Resend] Erro ao enviar verificação:", error);
    throw new Error(
      resendTestingModeUserMessage(error) ??
        `Falha ao enviar verificação: ${formatResendApiError(error)}`,
    );
  }

  return data ?? undefined;
}

// ─── Confirmação de troca de e-mail (enviado ao e-mail atual da conta) ───────

export async function sendChangeEmailVerificationEmail({
  to,
  name,
  newEmail,
  confirmLink,
}: {
  to: string;
  name: string;
  newEmail: string;
  confirmLink: string;
}): Promise<{ id: string } | undefined> {
  if (process.env.NODE_ENV === "development" && !getResend()) {
    console.log(
      "\n📧 [DEV] Troca de e-mail — sem RESEND_API_KEY nada é enviado (nem aparece na Resend).",
    );
    console.log("Para (e-mail atual da conta):", to);
    console.log("Novo e-mail:", newEmail);
    console.log("Link (use para testar):", confirmLink);
    console.log(
      "Adicione RESEND_API_KEY e RESEND_FROM_EMAIL no .env.local e reinicie o servidor.\n",
    );
    throw new Error(
      "Em desenvolvimento é preciso RESEND_API_KEY no .env.local para enviar e-mail. O link acima foi logado no terminal do servidor.",
    );
  }

  const resend = getResend();
  if (!resend) {
    console.error("[Resend] RESEND_API_KEY ausente — não foi possível enviar troca de e-mail.");
    throw new Error("Falha ao enviar e-mail de confirmação");
  }

  const appUrl = getAppUrl();
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: "Confirme a alteração do seu e-mail — Piloto",
    html: changeEmailVerificationTemplate({
      name,
      newEmail,
      confirmLink,
      appUrl,
    }),
  });

  if (error) {
    console.error("[Resend] Erro ao enviar confirmação de troca de e-mail:", error);
    throw new Error(
      resendTestingModeUserMessage(error) ??
        `Falha ao enviar confirmação de troca de e-mail: ${formatResendApiError(error)}. Confira RESEND_FROM_EMAIL e domínio verificado na Resend.`,
    );
  }

  return data ?? undefined;
}

// ─── Boas-vindas (opcional — chamar após cadastro se desejar) ────────────────

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}): Promise<{ id: string } | undefined> {
  const bypass = devBypassWithoutResendKey(() => {
    console.log(
      "\n📧 [DEV] Boas-vindas — RESEND_API_KEY ausente; e-mail não enviado.",
    );
    console.log("Para:", to);
    console.log("Defina RESEND_API_KEY no .env.local para enviar de verdade.\n");
  });
  if (bypass) return bypass;

  const resend = getResend();
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY ausente — boas-vindas não enviado.");
    return undefined;
  }

  const appUrl = getAppUrl();
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: `Bem-vindo ao Piloto, ${name.split(" ")[0] ?? name}!`,
    html: welcomeTemplate({ name, appUrl }),
  });

  if (error) {
    console.error("[Resend] Erro ao enviar e-mail de boas-vindas:", error);
    return undefined;
  }

  return data ?? undefined;
}

// ─── Templates HTML ──────────────────────────────────────────────────────────

function passwordResetTemplate({
  name,
  resetLink,
  appUrl,
}: {
  name: string;
  resetLink: string;
  appUrl: string;
}) {
  const firstName = escapeHtml((name.split(" ")[0] || name).trim() || "motorista");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir senha — Piloto</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;">

          <tr>
            <td style="background:#000000;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;
                         letter-spacing:-0.5px;">PILOTO</p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6;">
                Olá, <strong>${firstName}</strong>
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no Piloto.
                Clique no botão abaixo para criar uma nova senha.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#000000;border-radius:8px;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:14px 32px;font-size:14px;
                              font-weight:700;color:#ffffff;text-decoration:none;
                              letter-spacing:0.3px;">
                      Redefinir minha senha
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#888888;line-height:1.6;">
                Este link expira em <strong>1 hora</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:13px;color:#888888;line-height:1.6;">
                Se você não solicitou a redefinição de senha, ignore este e-mail.
                Sua senha permanece a mesma.
              </p>

              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <a href="${resetLink}"
                   style="color:#000000;word-break:break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f6f6f6;padding:20px 40px;
                        border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                Piloto — Controle financeiro para motoristas de aplicativo<br>
                <a href="${appUrl}/privacidade"
                   style="color:#aaaaaa;">Política de Privacidade</a>
                &nbsp;·&nbsp;
                <a href="${appUrl}/termos"
                   style="color:#aaaaaa;">Termos de Uso</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function verificationEmailTemplate({
  name,
  verificationLink,
  appUrl,
}: {
  name: string;
  verificationLink: string;
  appUrl: string;
}) {
  const firstName = escapeHtml((name.split(" ")[0] || name).trim() || "motorista");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu e-mail — Piloto</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#000000;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">PILOTO</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6;">
                Olá, <strong>${firstName}</strong>
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
                Confirme seu endereço de e-mail para ativar sua conta Piloto.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#000000;border-radius:8px;">
                    <a href="${verificationLink}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Confirmar meu e-mail
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                <a href="${verificationLink}" style="color:#000000;word-break:break-all;">${verificationLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f6f6f6;padding:20px 40px;border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                <a href="${appUrl}/privacidade" style="color:#aaaaaa;">Política de Privacidade</a>
                &nbsp;·&nbsp;
                <a href="${appUrl}/termos" style="color:#aaaaaa;">Termos de Uso</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function changeEmailVerificationTemplate({
  name,
  newEmail,
  confirmLink,
  appUrl,
}: {
  name: string;
  newEmail: string;
  confirmLink: string;
  appUrl: string;
}) {
  const firstName = escapeHtml((name.split(" ")[0] || name).trim() || "motorista");
  const newEmailSafe = escapeHtml(newEmail);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmar novo e-mail — Piloto</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#000000;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">PILOTO</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6;">
                Olá, <strong>${firstName}</strong>
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
                Recebemos um pedido para alterar o e-mail da sua conta Piloto para
                <strong>${newEmailSafe}</strong>. Se foi você, confirme clicando no botão abaixo.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#000000;border-radius:8px;">
                    <a href="${confirmLink}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Confirmar novo e-mail
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:13px;color:#888888;line-height:1.6;">
                Se você não solicitou esta alteração, ignore este e-mail — seu login continua o mesmo.
              </p>
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                <a href="${confirmLink}" style="color:#000000;word-break:break-all;">${confirmLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f6f6f6;padding:20px 40px;border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                <a href="${appUrl}/privacidade" style="color:#aaaaaa;">Política de Privacidade</a>
                &nbsp;·&nbsp;
                <a href="${appUrl}/termos" style="color:#aaaaaa;">Termos de Uso</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function welcomeTemplate({
  name,
  appUrl,
}: {
  name: string;
  appUrl: string;
}) {
  const firstName = escapeHtml((name.split(" ")[0] || name).trim() || "motorista");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Piloto</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;">

          <tr>
            <td style="background:#000000;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;
                         letter-spacing:-0.5px;">PILOTO</p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6;">
                Olá, <strong>${firstName}</strong> — bem-vindo ao Piloto!
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
                Sua conta foi criada com sucesso. Agora você tem tudo que precisa
                para descobrir quanto realmente ganha por corrida.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#000000;border-radius:8px;">
                    <a href="${appUrl}/onboarding/veiculo"
                       style="display:inline-block;padding:14px 32px;font-size:14px;
                              font-weight:700;color:#ffffff;text-decoration:none;">
                      Configurar minha conta
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#888888;">
                Próximos passos:
              </p>
              <ul style="margin:0 0 24px;padding-left:20px;
                          font-size:13px;color:#555555;line-height:2;">
                <li>Cadastre seu veículo (consumo e combustível)</li>
                <li>Defina sua meta de lucro mensal</li>
                <li>Registre sua primeira corrida</li>
              </ul>
            </td>
          </tr>

          <tr>
            <td style="background:#f6f6f6;padding:20px 40px;
                        border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                Piloto — Controle financeiro para motoristas de aplicativo<br>
                <a href="${appUrl}/privacidade" style="color:#aaaaaa;">Política de Privacidade</a>
                &nbsp;·&nbsp;
                <a href="${appUrl}/termos" style="color:#aaaaaa;">Termos de Uso</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
