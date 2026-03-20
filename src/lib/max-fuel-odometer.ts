import { and, eq, isNotNull, max, ne, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";

/** Maior odômetro registrado em abastecimentos; opcionalmente exclui um gasto (edição). */
export async function getMaxFuelOdometerExcluding(
  userId: string,
  excludeExpenseId: string | null,
): Promise<number | null> {
  const conditions: SQL[] = [
    eq(expenses.userId, userId),
    eq(expenses.category, "fuel"),
    isNotNull(expenses.odometer),
  ];
  if (excludeExpenseId) {
    conditions.push(ne(expenses.id, excludeExpenseId));
  }
  const [row] = await db
    .select({ m: max(expenses.odometer) })
    .from(expenses)
    .where(and(...conditions));
  if (row?.m === null || row?.m === undefined) return null;
  return Number(row.m);
}
