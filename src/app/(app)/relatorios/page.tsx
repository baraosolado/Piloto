import { redirect } from "next/navigation";
import { RelatoriosClient } from "@/components/reports/relatorios-client";
import { requireSession } from "@/lib/get-session";
import { getEffectivePlan } from "@/lib/plan-limits";
import {
  getReportsSummary,
  serializeReportsSummary,
} from "@/lib/reports-summary";
import { getVehicleForUser } from "@/lib/dashboard-data";
import type { Vehicle } from "@/lib/calculations";

function parseMonthYear(
  rawM: string | string[] | undefined,
  rawY: string | string[] | undefined,
): { month: number; year: number } | null {
  const m = Number(Array.isArray(rawM) ? rawM[0] : rawM);
  const y = Number(Array.isArray(rawY) ? rawY[0] : rawY);
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;
  return { month: m, year: y };
}

function toVehicle(
  row: Awaited<ReturnType<typeof getVehicleForUser>>,
): Vehicle | null {
  if (!row) return null;
  return {
    fuelConsumption: Number(row.fuelConsumption),
    fuelPrice: Number(row.fuelPrice),
    depreciationPerKm: Number(row.depreciationPerKm),
  };
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await requireSession();
  const userId = session.user.id;
  const sp = await searchParams;

  const now = new Date();
  const defaultMonth = now.getUTCMonth() + 1;
  const defaultYear = now.getUTCFullYear();

  const parsed = parseMonthYear(sp.month, sp.year);
  if (!parsed) {
    redirect(`/relatorios?month=${defaultMonth}&year=${defaultYear}`);
  }

  const [plan, summaryRaw, vehicleRow] = await Promise.all([
    getEffectivePlan(userId, session.user.email),
    getReportsSummary(userId, parsed.year, parsed.month),
    getVehicleForUser(userId),
  ]);

  const isPremium = plan === "premium";
  const summary = serializeReportsSummary(summaryRaw);

  return (
    <div className="min-h-screen bg-[#F6F6F6] p-6">
      <RelatoriosClient
        summary={summary}
        isPremium={isPremium}
        vehicle={toVehicle(vehicleRow)}
      />
    </div>
  );
}
