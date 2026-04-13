import { NextResponse } from "next/server";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { getMaintenanceAlertCounts } from "@/lib/maintenance-alert-badge";
import { requireSession } from "@/lib/api-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  return runWithAppUserId(auth.userId, async () => {
  const counts = await getMaintenanceAlertCounts(auth.userId);
  return NextResponse.json({ data: counts, error: null });
  });
}
