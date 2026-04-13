import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { runMaintenancePushCron } from "@/lib/maintenance-push-cron";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Cron: envia push de manutenção (próximas/atrasadas) para usuários inscritos.
 * Proteção: Authorization: Bearer CRON_SECRET ou header x-cron-secret.
 * Na Vercel, configure CRON_SECRET e use o cron em vercel.json.
 */
async function handleCron(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Negado." } },
      { status: 401 },
    );
  }

  const result = await runMaintenancePushCron();
  return NextResponse.json({ data: result, error: null });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
