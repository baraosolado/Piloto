import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  extractUserIdFromBetterAuthJson,
  peekEmailDomainFromJsonBody,
} from "@/lib/auth-credential-logging";
import { toNextJsHandler } from "better-auth/next-js";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { consumeAuthRateLimit } from "@/lib/rate-limiter";
import {
  logAuthCredentialEvent,
  logAuthRateLimitHit,
} from "@/lib/security-log";

const { GET: baseGET, POST: basePOST } = toNextJsHandler(auth);

/**
 * Limita por IP só fluxos com credenciais / e-mail públicos.
 * Rotas do plugin admin (ban-user, list-users, impersonate…) usam sessão
 * autenticada e não devem partilhar o mesmo balde que sign-in (5/15min),
 * senão o painel Mestre e o cliente admin disparam 429 em desenvolvimento.
 */
function shouldApplyCredentialIpRateLimit(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (p.includes("/admin/")) return false;
  const credentialFragments = [
    "/sign-in",
    "/sign-up",
    "/forget-password",
    "/reset-password",
    "/verify-email",
    "/send-verification-email",
  ];
  return credentialFragments.some((frag) => p.includes(frag));
}

export async function GET(request: Request) {
  return baseGET(request);
}

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;
  const ip = getClientIpFromHeaders(request.headers);

  if (shouldApplyCredentialIpRateLimit(pathname)) {
    const limited = await consumeAuthRateLimit(ip);
    if (!limited.ok) {
      logAuthRateLimitHit(request);
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "RATE_LIMITED",
            message:
              "Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.",
          },
        },
        { status: 429 },
      );
    }
  }

  const isSignIn = pathname.includes("/sign-in/email");
  const isSignUp = pathname.includes("/sign-up/email");
  const emailDomain =
    isSignIn || isSignUp ? await peekEmailDomainFromJsonBody(request) : undefined;

  const response = await basePOST(request);

  if (isSignIn) {
    if (response.ok) {
      let userId: string | undefined;
      try {
        const json: unknown = await response.clone().json();
        userId = extractUserIdFromBetterAuthJson(json);
      } catch {
        /* ignore */
      }
      logAuthCredentialEvent({
        event: "auth_sign_in_success",
        path: pathname,
        ip,
        userId,
        emailDomain,
      });
    } else {
      logAuthCredentialEvent({
        event: "auth_sign_in_failed",
        path: pathname,
        ip,
        emailDomain,
      });
    }
  } else if (isSignUp) {
    if (response.ok) {
      let userId: string | undefined;
      try {
        const json: unknown = await response.clone().json();
        userId = extractUserIdFromBetterAuthJson(json);
      } catch {
        /* ignore */
      }
      logAuthCredentialEvent({
        event: "auth_sign_up_success",
        path: pathname,
        ip,
        userId,
        emailDomain,
      });
    } else {
      logAuthCredentialEvent({
        event: "auth_sign_up_failed",
        path: pathname,
        ip,
        emailDomain,
      });
    }
  }

  return response;
}
