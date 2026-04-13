type HeaderBag = { get(name: string): string | null };

/** Extrai IP do cliente a partir de cabeçalhos de proxy (Edge-safe, sem deps Node). */
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
