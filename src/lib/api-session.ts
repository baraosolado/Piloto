import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeApiRateLimit } from "@/lib/rate-limiter";

export async function getSessionUserId(): Promise<
  | { userId: string; email: string | null }
  | { response: NextResponse }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
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

  return {
    userId: session.user.id,
    email: session.user.email ?? null,
  };
}
