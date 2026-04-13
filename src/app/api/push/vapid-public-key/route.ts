import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-session";
import { getVapidPublicKey, isWebPushConfigured } from "@/lib/web-push-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "NOT_CONFIGURED",
          message: "Notificações push não estão configuradas no servidor.",
        },
      },
      { status: 503 },
    );
  }
  const publicKey = getVapidPublicKey();
  return NextResponse.json({
    data: { publicKey },
    error: null,
  });
}
