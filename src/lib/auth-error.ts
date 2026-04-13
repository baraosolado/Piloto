/**
 * Better Auth / better-fetch às vezes devolvem `error` como objeto vazio ou com
 * campos não enumeráveis — normaliza para mensagem e string de log.
 */
export function formatAuthClientError(error: unknown): {
  message: string;
  logLine: string;
} {
  if (error == null) {
    return { message: "", logLine: "null" };
  }
  if (typeof error === "string") {
    const t = error.trim();
    return { message: t, logLine: t || "(string vazia)" };
  }
  if (typeof error !== "object") {
    const s = String(error);
    return { message: s, logLine: s };
  }

  const o = error as Record<string, unknown>;
  const msg =
    typeof o.message === "string" && o.message.trim()
      ? o.message.trim()
      : "";
  const code =
    typeof o.code === "string" && o.code.trim() ? o.code.trim() : "";
  const status = typeof o.status === "number" ? o.status : undefined;

  const message =
    msg ||
    (code && status != null
      ? `${code} (${status})`
      : code || (status != null ? `Erro HTTP ${status}` : ""));

  let logLine: string;
  try {
    logLine = JSON.stringify({
      message: o.message,
      code: o.code,
      status: o.status,
      ...Object.fromEntries(
        Object.entries(o).filter(
          ([k]) => !["message", "code", "status"].includes(k),
        ),
      ),
    });
  } catch {
    logLine = message || "{}";
  }

  return { message, logLine: logLine === "{}" ? "{}" : logLine };
}
