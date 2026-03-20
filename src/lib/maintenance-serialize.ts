import { maintenanceItems } from "@/db/schema";
import { computeMaintenanceDerived } from "@/lib/maintenance-computed";

export function serializeMaintenanceItem(
  row: typeof maintenanceItems.$inferSelect,
  currentOdometer: number | null,
) {
  const est =
    row.estimatedCost !== null ? Number(row.estimatedCost) : null;
  const derived = computeMaintenanceDerived(
    currentOdometer,
    row.lastServiceKm,
    row.intervalKm,
  );
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    lastServiceKm: row.lastServiceKm,
    lastServiceAt: row.lastServiceAt.toISOString(),
    intervalKm: row.intervalKm,
    estimatedCost: est,
    ...derived,
    progressPercent:
      derived.percentageDue !== null
        ? Math.min(100, Math.round(derived.percentageDue * 100))
        : null,
  };
}

export type MaintenanceItemDto = ReturnType<
  typeof serializeMaintenanceItem
>;
