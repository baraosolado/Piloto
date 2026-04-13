import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { webPushSubscriptions } from "@/db/schema";
import { requireSession } from "@/lib/api-session";
import { isWebPushConfigured } from "@/lib/web-push-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const serverReady = isWebPushConfigured();

  return runWithAppUserId(auth.userId, async () => {
  const [row] = await getRequestDb()
    .select({ n: count() })
    .from(webPushSubscriptions)
    .where(eq(webPushSubscriptions.userId, auth.userId));

  const subscriptionCount = Number(row?.n ?? 0);

  return NextResponse.json({
    data: {
      serverReady,
      subscriptionCount,
    },
    error: null,
  });
  });
}
