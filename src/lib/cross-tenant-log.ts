import { headers } from "next/headers";
import { pool } from "@/db";
import { logCrossTenantAccessAttempt } from "@/lib/security-log";

async function requestPath(): Promise<string> {
  const h = await headers();
  return h.get("x-copilote-req-path") ?? "unknown";
}

/** Se existir corrida com esse id e outro dono, registra evento de segurança (antes do 404). */
export async function logIfRideOwnedByOtherUser(
  rideId: string,
  sessionUserId: string,
): Promise<void> {
  const { rows } = await pool.query(
    "SELECT copilote_fn_ride_owner_id($1::uuid) AS owner_id",
    [rideId],
  );
  const ownerId = rows[0]?.owner_id as string | null | undefined;
  if (ownerId && ownerId !== sessionUserId) {
    logCrossTenantAccessAttempt({
      resource: "rides",
      resourceId: rideId,
      sessionUserId,
      path: await requestPath(),
    });
  }
}

export async function logIfExpenseOwnedByOtherUser(
  expenseId: string,
  sessionUserId: string,
): Promise<void> {
  const { rows } = await pool.query(
    "SELECT copilote_fn_expense_owner_id($1::uuid) AS owner_id",
    [expenseId],
  );
  const ownerId = rows[0]?.owner_id as string | null | undefined;
  if (ownerId && ownerId !== sessionUserId) {
    logCrossTenantAccessAttempt({
      resource: "expenses",
      resourceId: expenseId,
      sessionUserId,
      path: await requestPath(),
    });
  }
}

export async function logIfMaintenanceOwnedByOtherUser(
  itemId: string,
  sessionUserId: string,
): Promise<void> {
  const { rows } = await pool.query(
    "SELECT copilote_fn_maintenance_item_owner_id($1::uuid) AS owner_id",
    [itemId],
  );
  const ownerId = rows[0]?.owner_id as string | null | undefined;
  if (ownerId && ownerId !== sessionUserId) {
    logCrossTenantAccessAttempt({
      resource: "maintenance_items",
      resourceId: itemId,
      sessionUserId,
      path: await requestPath(),
    });
  }
}
