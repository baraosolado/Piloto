import { redirect } from "next/navigation";
import { RelatoriosClient } from "@/components/reports/relatorios-client";
import { safeParseReportRangeFromParams } from "@/lib/api-query-validators";
import { requireSession } from "@/lib/get-session";
import { getEffectivePlan } from "@/lib/plan-limits";
import {
  getReportsSummary,
  getReportsSummaryForRange,
  serializeReportsSummary,
} from "@/lib/reports-summary";
import { getVehicleForUser } from "@/lib/dashboard-data";
import type { Vehicle } from "@/lib/calculations";
import { loadForAppUser } from "@/lib/load-for-app-user";
import { vehicleFromVehicleRow } from "@/lib/vehicle-powertrain";

function spStr(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (Array.isArray(v)) return v[0]?.trim() || undefined;
  return undefined;
}

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
  return vehicleFromVehicleRow(row);
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    year?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await requireSession();
  const userId = session.user.id;
  const sp = await searchParams;

  const now = new Date();
  const defaultMonth = now.getUTCMonth() + 1;
  const defaultYear = now.getUTCFullYear();

  const fromQ = spStr(sp.from);
  const toQ = spStr(sp.to);
  const hasRangeParams = Boolean(fromQ || toQ);

  const rangeParsed = safeParseReportRangeFromParams(sp.from, sp.to);
  if (hasRangeParams && !rangeParsed.success) {
    redirect(`/relatorios?month=${defaultMonth}&year=${defaultYear}`);
  }
  if (rangeParsed.success) {
    const { start, end, from, to } = rangeParsed.data;
    const { isPremium, summary, vehicleRow } = await loadForAppUser(
      userId,
      async () => {
        const [plan, summaryRaw, vehicleRow] = await Promise.all([
          getEffectivePlan(userId, session.user.email),
          getReportsSummaryForRange(userId, start, end),
          getVehicleForUser(userId),
        ]);
        return {
          isPremium: plan === "premium",
          summary: serializeReportsSummary(summaryRaw),
          vehicleRow,
        };
      },
    );

    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <RelatoriosClient
          period={{ kind: "range" as const, from, to }}
          summary={summary}
          isPremium={isPremium}
          vehicle={toVehicle(vehicleRow)}
        />
      </div>
    );
  }

  const parsed = parseMonthYear(sp.month, sp.year);
  if (!parsed) {
    redirect(`/relatorios?month=${defaultMonth}&year=${defaultYear}`);
  }

  const { isPremium, summary, vehicleRow } = await loadForAppUser(
    userId,
    async () => {
      const [plan, summaryRaw, vehicleRow] = await Promise.all([
        getEffectivePlan(userId, session.user.email),
        getReportsSummary(userId, parsed.year, parsed.month),
        getVehicleForUser(userId),
      ]);
      return {
        isPremium: plan === "premium",
        summary: serializeReportsSummary(summaryRaw),
        vehicleRow,
      };
    },
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <RelatoriosClient
        period={{
          kind: "month" as const,
          month: parsed.month,
          year: parsed.year,
        }}
        summary={summary}
        isPremium={isPremium}
        vehicle={toVehicle(vehicleRow)}
      />
    </div>
  );
}
