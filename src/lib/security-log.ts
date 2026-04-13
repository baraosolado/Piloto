import { getClientIpFromHeaders } from "@/lib/client-ip";

type SecurityLogLevel = "security" | "warn" | "error";

export type SecurityLogPayload = {
  event: string;
  path?: string;
  ip?: string;
  userId?: string;
  detail?: string;
  resourceId?: string;
};

function forwardSecurityLogLine(line: string) {
  const url = process.env.SECURITY_LOG_INGEST_URL?.trim();
  if (!url) return;
  const token = process.env.SECURITY_LOG_INGEST_TOKEN?.trim();
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: line,
    keepalive: true,
  }).catch(() => {});
}

function emit(level: SecurityLogLevel, payload: SecurityLogPayload) {
  const entry = {
    level,
    ts: new Date().toISOString(),
    ...payload,
  };
  const line = JSON.stringify(entry);
  forwardSecurityLogLine(line);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.warn(line);
}

/** Execução do cron de retenção (anonimização); não contém dados pessoais no `detail`. */
export function logDataRetentionRun(args: {
  candidates: number;
  anonymized: number;
  dryRun: boolean;
}) {
  emit("warn", {
    event: "data_retention_run",
    detail: JSON.stringify({
      candidates: args.candidates,
      anonymized: args.anonymized,
      dryRun: args.dryRun,
    }),
  });
}

/** Rate limit atingido (sem dados sensíveis). */
export function logAuthRateLimitHit(request: Request) {
  emit("warn", {
    event: "auth_rate_limit_hit",
    path: new URL(request.url).pathname,
    ip: getClientIpFromHeaders(request.headers),
  });
}

/** Assinatura Stripe do webhook inválida ou ausente. */
export function logStripeWebhookRejected(request: Request, reason: string) {
  emit("security", {
    event: "stripe_webhook_rejected",
    path: new URL(request.url).pathname,
    ip: getClientIpFromHeaders(request.headers),
    detail: reason,
  });
}

/** Sessão ausente ou inválida em rota `/api/*` autenticada. */
export function logApiSessionMissing(path: string, ip: string) {
  emit("security", {
    event: "api_session_missing",
    path,
    ip,
  });
}

/** Rate limit da API autenticada (por `userId`). */
export function logApiRateLimitHit(userId: string, path: string) {
  emit("warn", {
    event: "api_rate_limit_hit",
    userId,
    path,
  });
}

/**
 * Recurso existe no banco mas pertence a outro usuário (tentativa de acesso com sessão válida).
 * Resposta HTTP continua 404 para não revelar existência (SECURITY.md §2).
 */
export function logCrossTenantAccessAttempt(args: {
  resource: string;
  resourceId: string;
  sessionUserId: string;
  path: string;
}) {
  emit("security", {
    event: "cross_tenant_access_attempt",
    detail: args.resource,
    resourceId: args.resourceId,
    userId: args.sessionUserId,
    path: args.path,
  });
}

export type AuthCredentialLogEvent =
  | "auth_sign_in_success"
  | "auth_sign_in_failed"
  | "auth_sign_up_success"
  | "auth_sign_up_failed";

/** Login/cadastro e-mail+senha (Better Auth). `emailDomain` = só domínio em falhas (SECURITY-GAPS §2). */
export function logAuthCredentialEvent(args: {
  event: AuthCredentialLogEvent;
  path: string;
  ip: string;
  userId?: string;
  /** Domínio do e-mail (ex. `gmail.com`), nunca o endereço completo */
  emailDomain?: string;
}) {
  emit("security", {
    event: args.event,
    path: args.path,
    ip: args.ip,
    userId: args.userId,
    detail: args.emailDomain,
  });
}

export { logServerRequestCrash } from "@/lib/security-log-server-crash";
