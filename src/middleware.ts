import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { isAllowedBrowserOrigin } from "@/lib/cors";

const GUEST_ONLY = new Set(["/login", "/cadastro"]);

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/onboarding")) return true;
  if (pathname.startsWith("/configuracoes")) return true;
  const roots = [
    "/dashboard",
    "/corridas",
    "/gastos",
    "/inteligencia",
    "/manutencao",
    "/metas",
    "/relatorios",
    "/planos",
  ];
  return roots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

function applyApiCorsHeaders(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const origin = request.headers.get("origin");
  if (origin && isAllowedBrowserOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.append("Vary", "Origin");
  }
  return response;
}

function handleApiRequest(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    if (origin && !isAllowedBrowserOrigin(origin)) {
      return new NextResponse(null, { status: 403 });
    }
    const res = new NextResponse(null, { status: 204 });
    if (origin && isAllowedBrowserOrigin(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
      res.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      res.headers.set("Access-Control-Max-Age", "86400");
      res.headers.append("Vary", "Origin");
    }
    return res;
  }

  if (origin && !isAllowedBrowserOrigin(origin)) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Origem não permitida.",
        },
      },
      { status: 403 },
    );
  }

  const res = NextResponse.next();
  return applyApiCorsHeaders(request, res);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.NODE_ENV === "production") {
    if (pathname.startsWith("/api/sentry-example")) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "NOT_FOUND", message: "Not found" },
        },
        { status: 404 },
      );
    }
    if (pathname.startsWith("/sentry-example")) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "NOT_FOUND", message: "Not found" },
        },
        { status: 404 },
      );
    }
  }

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/webhooks/stripe")) {
      return NextResponse.next();
    }
    return handleApiRequest(request);
  }

  const sessionToken = getSessionCookie(request);
  const isLoggedIn = Boolean(sessionToken);

  if (GUEST_ONLY.has(pathname)) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedPath(pathname)) {
    if (!isLoggedIn) {
      const login = new URL("/login", request.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/sentry-example-page",
    "/login",
    "/cadastro",
    "/dashboard",
    "/dashboard/:path*",
    "/corridas/:path*",
    "/gastos/:path*",
    "/inteligencia/:path*",
    "/manutencao/:path*",
    "/metas/:path*",
    "/relatorios/:path*",
    "/planos",
    "/planos/:path*",
    "/configuracoes",
    "/configuracoes/:path*",
    "/onboarding/:path*",
  ],
};
