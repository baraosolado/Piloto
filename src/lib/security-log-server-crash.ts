/**
 * Registo de erros não tratados para `instrumentation.onRequestError`.
 * Ficheiro isolado (sem imports de `@/lib/*`) para não puxar `rate-limiter-flexible`
 * para o bundle Edge do Next/Sentry.
 */

type SecurityLogPayload = {
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

function emitError(payload: SecurityLogPayload) {
  const entry = {
    level: "error" as const,
    ts: new Date().toISOString(),
    ...payload,
  };
  const line = JSON.stringify(entry);
  forwardSecurityLogLine(line);
  console.error(line);
}

/** Erro não tratado em handler RSC/route (Next `instrumentation.onRequestError`). */
export function logServerRequestCrash(err: unknown, path?: string) {
  const message = err instanceof Error ? err.message : String(err);
  emitError({
    event: "server_request_error",
    path,
    detail: message.slice(0, 500),
  });
}
