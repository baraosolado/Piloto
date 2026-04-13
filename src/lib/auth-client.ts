import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

function resolveAuthClientBaseURL(): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
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
