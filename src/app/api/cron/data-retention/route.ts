import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Cron: anonimização de contas muito antigas sem Premium ativo (LGPD / SECURITY-GAPS §5.11).
 * **Desativado por defeito** — `DATA_RETENTION_CRON_ENABLED=1` em produção.
 * Autorização: igual a `/api/cron/maintenance-push` (Bearer ou `x-cron-secret`).
 *
 * `import()` dinâmico: ver comentário em `maintenance-push/route.ts`.
 */
async function handleCron(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Negado." } },
      { status: 401 },
    );
  }

  const { runDataRetentionCron } = await import("@/lib/data-retention-cron");
  const result = await runDataRetentionCron();
  return NextResponse.json({ data: result, error: null });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
