import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CorridasView } from "@/components/rides/corridas-view";
import { RidesTableSkeleton } from "@/components/rides/rides-table-skeleton";
import { getVehicleForUser } from "@/lib/dashboard-data";
import type { Vehicle } from "@/lib/calculations";
import { vehicleFromVehicleRow } from "@/lib/vehicle-powertrain";
import { defaultRideListDateRange } from "@/lib/corridas-default-range";
import { requireSession } from "@/lib/get-session";
import { loadForAppUser } from "@/lib/load-for-app-user";
import {
  countRidesThisMonth,
  getEffectivePlan,
  isFreeRideLimitReached,
} from "@/lib/plan-limits";

function vehicleToCalc(
  row: Awaited<ReturnType<typeof getVehicleForUser>>,
): Vehicle | null {
  if (!row) return null;
  return vehicleFromVehicleRow(row);
}

function CorridasFallback() {
  return <RidesTableSkeleton />;
}

export default async function CorridasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const userId = session.user.id;

  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;

  if (!from || !to) {
    const d = defaultRideListDateRange();
    const next = new URLSearchParams();
    next.set("from", d.from);
    next.set("to", d.to);
    const platform = typeof sp.platform === "string" ? sp.platform : undefined;
    const sort = typeof sp.sort === "string" ? sp.sort : undefined;
    const page = typeof sp.page === "string" ? sp.page : undefined;
    if (platform) next.set("platform", platform);
    if (sort) next.set("sort", sort);
    if (page) next.set("page", page);
    redirect(`/corridas?${next.toString()}`);
  }

  const { vehicle, showFreeLimitBanner } = await loadForAppUser(
    userId,
    async () => {
      const vehicleRow = await getVehicleForUser(userId);
      const vehicle = vehicleToCalc(vehicleRow);
      const plan = await getEffectivePlan(userId, session.user.email);
      const ridesThisMonth = await countRidesThisMonth(userId);
      const showFreeLimitBanner =
        plan === "free" && isFreeRideLimitReached(ridesThisMonth);
      return { vehicle, showFreeLimitBanner };
    },
  );

  return (
    <Suspense fallback={<CorridasFallback />}>
      <CorridasView
        vehicle={vehicle}
        showFreeLimitBanner={showFreeLimitBanner}
      />
    </Suspense>
  );
}
