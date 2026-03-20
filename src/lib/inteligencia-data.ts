import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  calculateCostPerKm,
  calculateEfficiencyScore,
  calculateRideCost,
  calculateRideProfit,
  groupRidesByPlatform,
  shiftKeyFromRideStartedAt,
  utcDayToMondayFirstIndex,
  type Platform,
  type PlatformSummary,
  type Ride,
  type ScoreByShift,
  type Vehicle,
} from "@/lib/calculations";
import {
  fetchExpensesInRange,
  fetchRidesInRange,
  getVehicleForUser,
  type ExpenseRow,
  type RideRow,
} from "@/lib/dashboard-data";

export type ShiftRow = {
  key: keyof ScoreByShift;
  title: string;
  hoursRange: string;
  perHour: number;
  rideCount: number;
};

export type HeatmapCell = {
  profitPerHour: number | null;
};

export type HeatmapRow = {
  key: keyof ScoreByShift;
  title: string;
  hoursRange: string;
  cells: HeatmapCell[];
};

export type CostKmPoint = {
  monthKey: string;
  label: string;
  value: number | null;
};

export type InteligenciaPremiumData = {
  hasVehicle: boolean;
  shifts: ShiftRow[];
  bestShift: keyof ScoreByShift | null;
  worstShift: keyof ScoreByShift | null;
  heatmap: { rows: HeatmapRow[]; maxProfitPerHour: number };
  platforms: PlatformSummary[];
  bestPlatform: Platform | null;
  costKmSeries: CostKmPoint[];
  costKmTrend: "up" | "down" | "flat" | null;
  latestCostKm: number | null;
};

function toRide(row: RideRow): Ride {
  return {
    grossAmount: Number(row.grossAmount),
    distanceKm: Number(row.distanceKm),
    startedAt: row.startedAt,
    durationMinutes: row.durationMinutes,
    platform: row.platform,
  };
}

function toExpense(row: ExpenseRow) {
  return {
    category: row.category,
    amount: Number(row.amount),
    occurredAt: row.occurredAt,
  };
}

function vehicleFromRow(
  row: Awaited<ReturnType<typeof getVehicleForUser>>,
): Vehicle | null {
  if (!row) return null;
  return {
    fuelConsumption: Number(row.fuelConsumption),
    fuelPrice: Number(row.fuelPrice),
    depreciationPerKm: Number(row.depreciationPerKm),
  };
}

const SHIFT_ORDER: {
  key: keyof ScoreByShift;
  title: string;
  hoursRange: string;
}[] = [
  { key: "night", title: "Madrugada", hoursRange: "00–06h" },
  { key: "morning", title: "Manhã", hoursRange: "06–12h" },
  { key: "afternoon", title: "Tarde", hoursRange: "12–18h" },
  { key: "evening", title: "Noite", hoursRange: "18–00h" },
];

function last30DaysRange(now: Date): { start: Date; end: Date } {
  const end = now;
  const start = new Date(now.getTime() - 30 * 86_400_000);
  return { start, end };
}

function utcMonthRange(
  year: number,
  monthIndex0: number,
): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, monthIndex0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex0 + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function hoursByShiftFromRides(rides: Ride[]): Record<keyof ScoreByShift, number> {
  const h: Record<keyof ScoreByShift, number> = {
    night: 0,
    morning: 0,
    afternoon: 0,
    evening: 0,
  };
  for (const ride of rides) {
    const mins = ride.durationMinutes;
    if (mins === null || mins <= 0) continue;
    const k = shiftKeyFromRideStartedAt(ride.startedAt);
    h[k] += mins / 60;
  }
  return h;
}

function buildHeatmap(
  rideRows: RideRow[],
  vehicle: Vehicle,
): { rows: HeatmapRow[]; maxProfitPerHour: number } {
  const profit = new Map<string, number>();
  const hours = new Map<string, number>();

  for (const row of rideRows) {
    const ride = toRide(row);
    const mins = ride.durationMinutes;
    if (mins === null || mins <= 0) continue;
    const cost = calculateRideCost(ride.distanceKm, vehicle);
    if (Number.isNaN(cost)) continue;
    const p = calculateRideProfit(ride.grossAmount, cost);
    const h = mins / 60;
    const shift = shiftKeyFromRideStartedAt(ride.startedAt);
    const col = utcDayToMondayFirstIndex(ride.startedAt.getUTCDay());
    const k = `${shift}:${col}`;
    profit.set(k, (profit.get(k) ?? 0) + p);
    hours.set(k, (hours.get(k) ?? 0) + h);
  }

  let maxProfitPerHour = 0;
  const rows: HeatmapRow[] = SHIFT_ORDER.map(({ key, title, hoursRange }) => {
    const cells: HeatmapCell[] = [];
    for (let col = 0; col < 7; col++) {
      const k = `${key}:${col}`;
      const hp = hours.get(k) ?? 0;
      const pp = profit.get(k) ?? 0;
      const pph = hp > 0 ? pp / hp : null;
      if (pph !== null && pph > maxProfitPerHour) maxProfitPerHour = pph;
      cells.push({ profitPerHour: pph });
    }
    return { key, title, hoursRange, cells };
  });

  return { rows, maxProfitPerHour };
}

function countRidesByShift(rideRows: RideRow[]): Record<keyof ScoreByShift, number> {
  const c: Record<keyof ScoreByShift, number> = {
    night: 0,
    morning: 0,
    afternoon: 0,
    evening: 0,
  };
  for (const row of rideRows) {
    const ride = toRide(row);
    c[shiftKeyFromRideStartedAt(ride.startedAt)] += 1;
  }
  return c;
}

function pickBestWorstShifts(
  scores: ScoreByShift,
  hoursByShift: Record<keyof ScoreByShift, number>,
): { best: keyof ScoreByShift | null; worst: keyof ScoreByShift | null } {
  const keys = SHIFT_ORDER.map((s) => s.key);
  const active = keys.filter((k) => hoursByShift[k] > 0);
  if (active.length === 0) return { best: null, worst: null };
  let bestK = active[0];
  let worstK = active[0];
  for (const k of active) {
    if (scores[k] > scores[bestK]) bestK = k;
    if (scores[k] < scores[worstK]) worstK = k;
  }
  if (bestK === worstK) return { best: bestK, worst: null };
  return { best: bestK, worst: worstK };
}

function pickBestPlatform(rows: PlatformSummary[]): Platform | null {
  let best: PlatformSummary | null = null;
  for (const r of rows) {
    if (r.rideCount === 0) continue;
    if (r.totalNetProfit === 0 && r.totalGross === 0) continue;
    if (!best || r.profitPerHour > best.profitPerHour) best = r;
  }
  return best?.platform ?? null;
}

export async function getInteligenciaPremiumData(
  userId: string,
  now = new Date(),
): Promise<InteligenciaPremiumData> {
  const vehicleRow = await getVehicleForUser(userId);
  const vehicle = vehicleFromRow(vehicleRow);
  const hasVehicle = vehicle !== null;

  const range30 = last30DaysRange(now);
  const rideRows30 = await fetchRidesInRange(userId, range30);
  const rides30 = rideRows30.map(toRide);

  const emptyScores: ScoreByShift = {
    night: 0,
    morning: 0,
    afternoon: 0,
    evening: 0,
  };

  const scores = hasVehicle
    ? calculateEfficiencyScore(rides30, [], vehicle)
    : emptyScores;
  const hoursByShift = hoursByShiftFromRides(rides30);
  const rideCountByShift = countRidesByShift(rideRows30);
  const { best, worst } = pickBestWorstShifts(scores, hoursByShift);

  const shifts: ShiftRow[] = SHIFT_ORDER.map(({ key, title, hoursRange }) => ({
    key,
    title,
    hoursRange,
    perHour: scores[key],
    rideCount: rideCountByShift[key],
  }));

  const heatmap = hasVehicle
    ? buildHeatmap(rideRows30, vehicle)
    : { rows: SHIFT_ORDER.map(({ key, title, hoursRange }) => ({
        key,
        title,
        hoursRange,
        cells: Array.from({ length: 7 }, () => ({
          profitPerHour: null as number | null,
        })),
      })), maxProfitPerHour: 0 };

  const platforms = hasVehicle
    ? groupRidesByPlatform(rides30, [], vehicle)
    : groupRidesByPlatform(rides30, [], {
        fuelConsumption: 1,
        fuelPrice: 0,
        depreciationPerKm: 0,
      });

  const bestPlatform = pickBestPlatform(platforms);

  const costKmSeries: CostKmPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const { start, end } = utcMonthRange(y, m);
    const [rRows, eRows] = await Promise.all([
      fetchRidesInRange(userId, { start, end }),
      fetchExpensesInRange(userId, { start, end }),
    ]);
    const r = rRows.map(toRide);
    const e = eRows.map(toExpense);
    const totalKm = r.reduce((s, x) => s + x.distanceKm, 0);
    const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
    const label = format(new Date(Date.UTC(y, m, 15)), "MMM", {
      locale: ptBR,
    });
    const value = totalKm > 0 ? calculateCostPerKm(e, r) : null;
    costKmSeries.push({ monthKey, label, value });
  }

  const last = costKmSeries[costKmSeries.length - 1];
  const prev = costKmSeries[costKmSeries.length - 2];
  let costKmTrend: "up" | "down" | "flat" | null = null;
  if (
    last?.value != null &&
    prev?.value != null &&
    last.value > 0 &&
    prev.value > 0
  ) {
    const eps = 0.0001;
    if (last.value > prev.value + eps) costKmTrend = "up";
    else if (last.value < prev.value - eps) costKmTrend = "down";
    else costKmTrend = "flat";
  }

  const latestCostKm = last?.value ?? null;

  return {
    hasVehicle,
    shifts,
    bestShift: best,
    worstShift: worst,
    heatmap,
    platforms,
    bestPlatform,
    costKmSeries,
    costKmTrend,
    latestCostKm,
  };
}
