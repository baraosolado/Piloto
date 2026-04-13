import { and, between, count, eq } from "drizzle-orm";
import { getRequestDb } from "@/db/request-db";
import { expenses, rides, subscriptions, users } from "@/db/schema";
import { PREMIUM_TRIAL_DAYS } from "@/lib/pricing";

export const FREE_RIDES_PER_MONTH = 50;
export const FREE_EXPENSES_PER_MONTH = 20;

/**
 * Contas de desenvolvedor: acesso equivalente a Premium (paywall, limites de API, etc.).
 * Configure no `.env.local`:
 * - `PILOTO_DEVELOPER_USER_IDS` — UUIDs separados por vírgula
 * - `PILOTO_DEVELOPER_EMAILS` — e-mails separados por vírgula (case-insensitive)
 */
function parseCommaSet(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isDeveloperAccount(
  userId: string,
  email: string | null | undefined,
): boolean {
  const ids = parseCommaSet(process.env.PILOTO_DEVELOPER_USER_IDS);
  if (ids.size > 0 && ids.has(userId.toLowerCase())) return true;
  const emails = parseCommaSet(process.env.PILOTO_DEVELOPER_EMAILS);
  if (emails.size > 0 && email) {
    if (emails.has(email.trim().toLowerCase())) return true;
  }
  return false;
}

/** Fim do trial local (conta criada → N dias com tudo liberado, sem Stripe). */
export function signupTrialEndsAt(createdAt: Date): Date {
  return new Date(
    createdAt.getTime() + PREMIUM_TRIAL_DAYS * 24 * 60 * 60 * 1000,
  );
}

export async function getUserCreatedAt(
  userId: string,
): Promise<Date | null> {
  const [row] = await getRequestDb()
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.createdAt ?? null;
}

/** Trial de boas-vindas: acesso total até `PREMIUM_TRIAL_DAYS` após criação da conta. */
export async function hasSignupTrialActive(userId: string): Promise<boolean> {
  const created = await getUserCreatedAt(userId);
  if (!created) return false;
  return Date.now() < signupTrialEndsAt(created).getTime();
}

/**
 * Conta “travada”: trial acabou e não há Premium no banco (Stripe).
 * Desenvolvedores nunca ficam bloqueados.
 */
export async function isAccountLockedWithoutSubscription(
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  if (isDeveloperAccount(userId, email)) return false;
  if ((await getUserPlan(userId)) === "premium") return false;
  return !(await hasSignupTrialActive(userId));
}

/**
 * Plano efetivo para UI, paywalls e limites:
 * Premium se desenvolvedor, assinatura no banco, **ou** dentro do trial de N dias.
 */
export async function getEffectivePlan(
  userId: string,
  email: string | null | undefined = null,
): Promise<"free" | "premium"> {
  if (isDeveloperAccount(userId, email)) return "premium";
  if ((await getUserPlan(userId)) === "premium") return "premium";
  if (await hasSignupTrialActive(userId)) return "premium";
  return "free";
}

function utcMonthRange(reference = new Date()): { start: Date; end: Date } {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function getUserPlan(
  userId: string,
): Promise<"free" | "premium"> {
  const [row] = await getRequestDb()
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return row?.plan === "premium" ? "premium" : "free";
}

export async function countRidesThisMonth(
  userId: string,
  reference = new Date(),
): Promise<number> {
  const { start, end } = utcMonthRange(reference);
  const [row] = await getRequestDb()
    .select({ n: count() })
    .from(rides)
    .where(
      and(eq(rides.userId, userId), between(rides.startedAt, start, end)),
    );
  return Number(row?.n ?? 0);
}

export async function countExpensesThisMonth(
  userId: string,
  reference = new Date(),
): Promise<number> {
  const { start, end } = utcMonthRange(reference);
  const [row] = await getRequestDb()
    .select({ n: count() })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        between(expenses.occurredAt, start, end),
      ),
    );
  return Number(row?.n ?? 0);
}

export function isFreeRideLimitReached(countThisMonth: number): boolean {
  return countThisMonth >= FREE_RIDES_PER_MONTH;
}

export function isFreeExpenseLimitReached(countThisMonth: number): boolean {
  return countThisMonth >= FREE_EXPENSES_PER_MONTH;
}
