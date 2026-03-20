/**
 * Chamadas à API HTTP do Better Auth (rotas em `/api/auth/*`).
 * Evita depender de tipagem incompleta do client.
 */
export async function authApiPost(
  path: "/change-password" | "/change-email",
  body: Record<string, unknown>,
): Promise<{ ok: boolean; message: string }> {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${origin}/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* ignore */
  }

  const p = payload as {
    message?: string;
    error?: string | { message?: string };
    data?: { message?: string };
  } | null;

  const errorMsg =
    typeof p?.error === "string"
      ? p.error
      : p?.error && typeof p.error === "object"
        ? p.error.message
        : undefined;

  const message =
    p?.message ??
    errorMsg ??
    p?.data?.message ??
    (res.ok ? "OK" : "Não foi possível concluir a operação.");

  return { ok: res.ok, message };
}
