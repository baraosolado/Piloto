function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Origens permitidas para chamadas browser → API (CORS).
 * Em dev inclui localhost comuns; em qualquer ambiente usa NEXT_PUBLIC_APP_URL.
 */
export function getAllowedApiOrigins(): string[] {
  const out = new Set<string>();
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (base) {
    out.add(normalizeOrigin(base));
    try {
      const u = new URL(base);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        const otherHost =
          u.hostname === "localhost" ? "127.0.0.1" : "localhost";
        out.add(`${u.protocol}//${otherHost}${u.port ? `:${u.port}` : ""}`);
      }
    } catch {
      /* ignore */
    }
  }
  if (process.env.NODE_ENV === "development") {
    out.add("http://localhost:3000");
    out.add("http://127.0.0.1:3000");
  }
  return [...out];
}

export function isAllowedBrowserOrigin(origin: string | null): boolean {
  if (!origin) return true;
  const allowed = getAllowedApiOrigins();
  return allowed.includes(normalizeOrigin(origin));
}
