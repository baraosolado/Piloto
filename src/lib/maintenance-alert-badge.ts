import { eq } from "drizzle-orm";
import { getRequestDb } from "@/db/request-db";
import { maintenanceItems, vehicles } from "@/db/schema";
import { serializeMaintenanceItem } from "@/lib/maintenance-serialize";

export type MaintenanceAlertCounts = {
  overdue: number;
  warning: number;
};

/**
 * Conta itens de manutenção em alerta (mesma regra da página /manutencao).
 */
export async function getMaintenanceAlertCounts(
  userId: string,
): Promise<MaintenanceAlertCounts> {
  const [vehicle] = await getRequestDb()
    .select({ currentOdometer: vehicles.currentOdometer })
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .limit(1);

  const currentOdometer =
    vehicle !== undefined ? vehicle.currentOdometer : null;

  const rows = await getRequestDb()
    .select()
    .from(maintenanceItems)
    .where(eq(maintenanceItems.userId, userId));

  let overdue = 0;
  let warning = 0;
  for (const row of rows) {
    const s = serializeMaintenanceItem(row, currentOdometer);
    if (s.status === "overdue") overdue += 1;
    else if (s.status === "warning") warning += 1;
  }

  return { overdue, warning };
}
