/**
 * URL base absoluta (redirects do Stripe Checkout / Customer Portal).
 * O Stripe exige `http://` ou `https://`; valores só com host/porta falham em silêncio com 500 genérico.
 */
export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim();
  if (!raw) {
    throw new Error("NEXT_PUBLIC_APP_URL ou BETTER_AUTH_URL é obrigatório");
  }
  let u = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(u)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_APP_URL (ou BETTER_AUTH_URL) deve incluir o protocolo (ex.: https://seudominio.com.br).",
      );
    }
    u = `http://${u}`;
  }
  return u;
}
