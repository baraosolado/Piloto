function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Em desenvolvimento, permite testar no celular na mesma Wi‑Fi (IP privado RFC 1918).
 * Evita 403 "Origem não permitida" no /api/* quando o .env ainda aponta para localhost.
 */
export function isDevelopmentPrivateLanOrigin(origin: string): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:") return false;
    const h = u.hostname;
    if (h === "localhost" || h === "127.0.0.1") return false;

    const parts = h.split(".").map((p) => Number.parseInt(p, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
    const [a, b] = parts;

    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  } catch {
    return false;
  }
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
  const normalized = normalizeOrigin(origin);
  const allowed = getAllowedApiOrigins();
  if (allowed.includes(normalized)) return true;
  if (isDevelopmentPrivateLanOrigin(normalized)) return true;
  return false;
}
