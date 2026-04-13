import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pool } from "@/db";
import { accounts, sessions, users } from "@/db/schema";
import { isDeveloperAccount } from "@/lib/plan-limits";
import { logDataRetentionRun } from "@/lib/security-log";

export type DataRetentionCronResult = {
  enabled: boolean;
  dryRun: boolean;
  cutoffIso: string;
  years: number;
  maxPerRun: number;
  candidates: number;
  anonymized: number;
  skippedDeveloper: number;
  skippedActivePremium: number;
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function hasActivePaidAccess(sub: {
  plan: string;
  currentPeriodEnd: Date | null;
} | null): boolean {
  if (!sub) return false;
  const now = new Date();
  if (sub.plan === "premium") {
    if (!sub.currentPeriodEnd || sub.currentPeriodEnd > now) return true;
  }
  return false;
}

type RetentionRpcRow = {
  user_id: string;
  email: string | null;
  plan: string | null;
  current_period_end: Date | null;
};

/**
 * Anonimiza contas muito antigas sem plano pago ativo (LGPD; ver SECURITY-GAPS.md).
 *
 * **Desativado por defeito:** defina `DATA_RETENTION_CRON_ENABLED=1` (ou `true`) em produção.
 * `DATA_RETENTION_DRY_RUN=1` — só contabiliza, não altera linhas.
 *
 * Critério: `created_at` e `updated_at` anteriores a N anos (default **3** via
 * `DATA_RETENTION_ANONYMIZE_AFTER_YEARS`), e-mail ainda não no formato de removido,
 * não é conta de desenvolvedor, e sem Premium com `current_period_end` futuro.
 */
export async function runDataRetentionCron(): Promise<DataRetentionCronResult> {
  const enabledRaw = process.env.DATA_RETENTION_CRON_ENABLED?.trim().toLowerCase();
  const enabled =
    enabledRaw === "1" ||
    enabledRaw === "true" ||
    enabledRaw === "yes";

  const dryRunRaw = process.env.DATA_RETENTION_DRY_RUN?.trim().toLowerCase();
  const dryRun =
    dryRunRaw === "1" || dryRunRaw === "true" || dryRunRaw === "yes";

  const years = parsePositiveInt(
    process.env.DATA_RETENTION_ANONYMIZE_AFTER_YEARS,
    3,
  );
  const maxPerRun = parsePositiveInt(
    process.env.DATA_RETENTION_MAX_PER_RUN,
    25,
  );

  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);

  const result: DataRetentionCronResult = {
    enabled,
    dryRun,
    cutoffIso: cutoff.toISOString(),
    years,
    maxPerRun,
    candidates: 0,
    anonymized: 0,
    skippedDeveloper: 0,
    skippedActivePremium: 0,
  };

  if (!enabled) {
    return result;
  }

  const inactiveEmailPattern = "removed-%@inactive.copilote";

  const { rows: rawRows } = await pool.query(
    `SELECT user_id, email, plan, current_period_end
     FROM copilote_fn_cron_data_retention_candidates($1::timestamptz, $2::text, $3::int)`,
    [cutoff, inactiveEmailPattern, maxPerRun * 4],
  );

  const rows = (rawRows as RetentionRpcRow[]).map((r) => ({
    id: r.user_id,
    email: r.email,
    plan: r.plan,
    currentPeriodEnd: r.current_period_end,
  }));

  const seen = new Set<string>();
  const uniqueRows: typeof rows = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    uniqueRows.push(r);
    if (uniqueRows.length >= maxPerRun) break;
  }

  for (const row of uniqueRows) {
    if (isDeveloperAccount(row.id, row.email)) {
      result.skippedDeveloper += 1;
      continue;
    }

    const sub =
      row.plan !== null || row.currentPeriodEnd !== null
        ? { plan: row.plan ?? "free", currentPeriodEnd: row.currentPeriodEnd }
        : null;

    if (hasActivePaidAccess(sub)) {
      result.skippedActivePremium += 1;
      continue;
    }

    result.candidates += 1;

    if (dryRun) {
      continue;
    }

    const newEmail = `removed-${row.id}@inactive.copilote`;

    await db.transaction(async (tx) => {
      await tx.delete(sessions).where(eq(sessions.userId, row.id));
      await tx.delete(accounts).where(eq(accounts.userId, row.id));
      await tx
        .update(users)
        .set({
          name: "[Titular removido]",
          email: newEmail,
          passwordHash: null,
          city: null,
          image: null,
          emailVerified: false,
          lgpdConsentAcceptedAt: null,
        })
        .where(eq(users.id, row.id));
    });

    result.anonymized += 1;
  }

  if (result.candidates > 0 || result.anonymized > 0) {
    logDataRetentionRun({
      candidates: result.candidates,
      anonymized: result.anonymized,
      dryRun: result.dryRun,
    });
  }

  return result;
}
