import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  expenses,
  goals,
  rides,
  users,
  vehicles,
} from "@/db/schema";
import {
  calculateCostPerKm,
  calculateMonthlyGoalProgress,
  calculateRideCost,
  calculateRideProfit,
  type Expense,
  type Goal,
  type Ride,
  type Vehicle,
} from "@/lib/calculations";
import {
  eachUtcDayInRange,
  type DateRange,
} from "@/lib/dashboard-period";

export type RideRow = typeof rides.$inferSelect;
export type ExpenseRow = typeof expenses.$inferSelect;

function toRide(row: RideRow): Ride {
  return {
    grossAmount: Number(row.grossAmount),
    distanceKm: Number(row.distanceKm),
    startedAt: row.startedAt,
    durationMinutes: row.durationMinutes,
    platform: row.platform,
  };
}

function toExpense(row: ExpenseRow): Expense {
  return {
    category: row.category,
    amount: Number(row.amount),
    occurredAt: row.occurredAt,
  };
}

function sumRideProfit(rows: RideRow[], vehicle: Vehicle): number {
  let s = 0;
  for (const row of rows) {
    const r = toRide(row);
    const cost = calculateRideCost(r.distanceKm, vehicle);
    if (Number.isNaN(cost)) continue;
    s += calculateRideProfit(r.grossAmount, cost);
  }
  return s;
}

export async function getUserDisplayName(userId: string): Promise<string> {
  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.name?.trim() || "";
}

export async function getVehicleForUser(
  userId: string,
): Promise<typeof vehicles.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function fetchRidesInRange(
  userId: string,
  range: DateRange,
): Promise<RideRow[]> {
  return db
    .select()
    .from(rides)
    .where(
      and(
        eq(rides.userId, userId),
        gte(rides.startedAt, range.start),
        lte(rides.startedAt, range.end),
      ),
    );
}

export async function fetchExpensesInRange(
  userId: string,
  range: DateRange,
): Promise<ExpenseRow[]> {
  return db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.occurredAt, range.start),
        lte(expenses.occurredAt, range.end),
      ),
    );
}

export async function fetchRecentRidesInRange(
  userId: string,
  range: DateRange,
  limit: number,
): Promise<RideRow[]> {
  return db
    .select()
    .from(rides)
    .where(
      and(
        eq(rides.userId, userId),
        gte(rides.startedAt, range.start),
        lte(rides.startedAt, range.end),
      ),
    )
    .orderBy(desc(rides.startedAt))
    .limit(limit);
}

export async function fetchGoalForUtcMonth(
  userId: string,
  year: number,
  month: number,
) {
  const [row] = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.year, year),
        eq(goals.month, month),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function fetchRidesInUtcMonth(
  userId: string,
  year: number,
  month: number,
): Promise<RideRow[]> {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return fetchRidesInRange(userId, { start, end });
}

export function aggregatePeriodStats(
  rideRows: RideRow[],
  expenseRows: ExpenseRow[],
  vehicle: Vehicle | null,
): {
  gross: number;
  totalExpenses: number;
  netProfit: number;
  costPerKm: number;
} {
  const gross = rideRows.reduce((s, r) => s + Number(r.grossAmount), 0);
  const totalExpenses = expenseRows.reduce((s, e) => s + Number(e.amount), 0);
  const ridesCalc = rideRows.map(toRide);
  const expensesCalc = expenseRows.map(toExpense);
  let netProfit = 0;
  if (vehicle) {
    netProfit = sumRideProfit(rideRows, vehicle) - totalExpenses;
  } else {
    netProfit = gross - totalExpenses;
  }
  const costPerKm = vehicle
    ? calculateCostPerKm(expensesCalc, ridesCalc)
    : 0;
  return { gross, totalExpenses, netProfit, costPerKm };
}

export function buildDailyProfitSeries(
  rideRows: RideRow[],
  vehicle: Vehicle | null,
  range: DateRange,
): { date: string; profit: number }[] {
  const days = eachUtcDayInRange(range.start, range.end);
  const byDay = new Map<string, number>();
  for (const d of days) {
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, 0);
  }
  if (!vehicle) {
    return days.map((d) => ({
      date: d.toISOString().slice(0, 10),
      profit: 0,
    }));
  }
  for (const row of rideRows) {
    const r = toRide(row);
    const key = r.startedAt.toISOString().slice(0, 10);
    const cost = calculateRideCost(r.distanceKm, vehicle);
    if (Number.isNaN(cost)) continue;
    const p = calculateRideProfit(r.grossAmount, cost);
    byDay.set(key, (byDay.get(key) ?? 0) + p);
  }
  return days.map((d) => ({
    date: d.toISOString().slice(0, 10),
    profit: byDay.get(d.toISOString().slice(0, 10)) ?? 0,
  }));
}

export function aggregateExpensesByCategory(
  expenseRows: ExpenseRow[],
): { category: string; label: string; amount: number }[] {
  const labels: Record<string, string> = {
    fuel: "Combustível",
    maintenance: "Manutenção",
    insurance: "Seguro",
    fine: "Multa",
    other: "Outros",
  };
  const map = new Map<string, number>();
  for (const e of expenseRows) {
    map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({
      category,
      label: labels[category] ?? category,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function goalProgressFromRows(
  goalRow: typeof goals.$inferSelect,
  monthRideRows: RideRow[],
  vehicle: Vehicle,
) {
  const goal: Goal = {
    monthlyTarget: Number(goalRow.monthlyTarget),
    month: goalRow.month,
    year: goalRow.year,
  };
  return calculateMonthlyGoalProgress(
    goal,
    monthRideRows.map(toRide),
    [],
    vehicle,
  );
}
