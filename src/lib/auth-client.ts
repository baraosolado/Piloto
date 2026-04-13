import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

function resolveAuthClientBaseURL(): string {
  const explicit = process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim().replace(
    /\/$/,
    "",
  );
  const fromAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    // URL explícita do auth (ex.: subdomínio dedicado) — único caso em que
    // o browser deve falar com outro origin que não o da barra de endereços.
    if (explicit) return explicit;
    // Mesmo deploy com domínio público (copilote.com.br) e build com
    // NEXT_PUBLIC_APP_URL interna (Easypanel): pedidos têm de ser same-origin.
    return window.location.origin.replace(/\/$/, "");
  }

  if (explicit) return explicit;
  if (fromAppUrl) return fromAppUrl;
  /* SSR / import no servidor: fallback típico de `next dev -p 3000` */
  return "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: resolveAuthClientBaseURL(),
  plugins: [
    adminClient({
      roles: {
        super_admin: adminAc,
        user: userAc,
      },
    }),
  ],
});
