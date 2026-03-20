import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import {
  consumeAuthRateLimit,
  getClientIpFromHeaders,
} from "@/lib/rate-limiter";

const { GET: baseGET, POST: basePOST } = toNextJsHandler(auth);

export async function GET(request: Request) {
  return baseGET(request);
}

export async function POST(request: Request) {
  const ip = getClientIpFromHeaders(request.headers);
  const limited = await consumeAuthRateLimit(ip);
  if (!limited.ok) {
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
  return basePOST(request);
}
