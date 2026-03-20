import { RateLimiterMemory } from "rate-limiter-flexible";

type HeaderBag = { get(name: string): string | null };

/** Sign-in / sign-up etc.: 5 req / 15 min por IP */
export const authRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60,
});

/** APIs autenticadas: 100 req / 1 min por usuário */
export const apiRateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

export function getClientIpFromHeaders(h: HeaderBag): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export async function consumeAuthRateLimit(
  ip: string,
): Promise<{ ok: true } | { ok: false }> {
  try {
    await authRateLimiter.consume(ip);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function consumeApiRateLimit(
  userId: string,
): Promise<{ ok: true } | { ok: false }> {
  try {
    await apiRateLimiter.consume(userId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
