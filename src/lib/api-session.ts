import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { isAccountLockedWithoutSubscription } from "@/lib/plan-limits";
import { consumeApiRateLimit } from "@/lib/rate-limiter";
import { logApiRateLimitHit, logApiSessionMissing } from "@/lib/security-log";

/** Rotas que continuam acessíveis com trial expirado (assinar / dados mínimos). */
function apiPathAllowsWhenAccountLocked(path: string): boolean {
  const p = path.split("?")[0] ?? "";
  const is = (prefix: string) =>
    p === prefix || p.startsWith(`${prefix}/`);
  if (is("/api/stripe/create-checkout")) return true;
  if (is("/api/stripe/create-portal")) return true;
  if (is("/api/stripe/cancel-subscription")) return true;
  if (is("/api/user/profile")) return true;
  if (is("/api/user/lgpd-consent")) return true;
  if (p === "/api/user") return true;
  return false;
}

/**
 * SECURITY.md §1.4 — exige sessão válida no início de Route Handlers em `/api/*`.
 * Retorna JSON 401 (não redireciona); inclui rate limit por usuário.
 */
export async function requireSession(): Promise<
  | { userId: string; email: string | null }
  | { response: NextResponse }
> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user?.id) {
    const path = h.get("x-copilote-req-path") ?? "unknown";
    logApiSessionMissing(path, getClientIpFromHeaders(h));
    return {
      response: NextResponse.json(
        {
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message: "Sessão inválida ou expirada.",
          },
        },
        { status: 401 },
      ),
    };
  }

  const limited = await consumeApiRateLimit(session.user.id);
  if (!limited.ok) {
    const path = h.get("x-copilote-req-path") ?? "unknown";
    logApiRateLimitHit(session.user.id, path);
    return {
      response: NextResponse.json(
        {
          data: null,
          error: {
            code: "RATE_LIMITED",
            message: "Muitas requisições. Aguarde um momento.",
          },
        },
        { status: 429 },
      ),
    };
  }

  const reqPath = h.get("x-copilote-req-path") ?? "";
  if (
    !apiPathAllowsWhenAccountLocked(reqPath) &&
    (await isAccountLockedWithoutSubscription(
      session.user.id,
      session.user.email ?? null,
    ))
  ) {
    return {
      response: NextResponse.json(
        {
          data: null,
          error: {
            code: "SUBSCRIPTION_REQUIRED",
            message:
              "O período gratuito de 7 dias terminou. Assine o Premium (mensal ou anual) para continuar usando a app.",
          },
        },
        { status: 403 },
      ),
    };
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? null,
  };
}
