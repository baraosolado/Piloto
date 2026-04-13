/**
 * Helpers para `POST /api/auth/*` — extrair metadados seguros para SECURITY-GAPS §2 (sem e-mail completo).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function peekEmailDomainFromJsonBody(
  request: Request,
): Promise<string | undefined> {
  try {
    const ct = request.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return;
    const json = (await request.clone().json()) as { email?: string };
    const email = typeof json.email === "string" ? json.email.trim() : "";
    const at = email.indexOf("@");
    if (at <= 0 || at === email.length - 1) return;
    return email.slice(at + 1).toLowerCase();
  } catch {
    return;
  }
}

export function extractUserIdFromBetterAuthJson(
  data: unknown,
  depth = 0,
): string | undefined {
  if (depth > 5 || data === null || data === undefined) return;
  if (typeof data !== "object") return;
  const o = data as Record<string, unknown>;
  if (typeof o.id === "string" && UUID_RE.test(o.id)) {
    return o.id;
  }
  for (const key of ["user", "data", "session"] as const) {
    if (key in o) {
      const inner = extractUserIdFromBetterAuthJson(o[key], depth + 1);
      if (inner) return inner;
    }
  }
  return;
}
