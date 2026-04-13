import { desc, eq } from "drizzle-orm";
import { pool } from "@/db";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import {
  maintenanceItems,
  maintenancePushLog,
  vehicles,
  webPushSubscriptions,
} from "@/db/schema";
import { serializeMaintenanceItem } from "@/lib/maintenance-serialize";
import {
  MAINTENANCE_PUSH_COOLDOWN_MS,
  isWebPushConfigured,
  sendWebPushToSubscription,
} from "@/lib/web-push-server";

export type MaintenancePushCronResult = {
  usersConsidered: number;
  usersNotified: number;
  subscriptionsRemoved: number;
  errors: number;
  skippedNoAlerts: number;
  skippedCooldown: number;
  skippedNotConfigured: boolean;
};

function buildMaintenanceBody(
  overdueTypes: string[],
  warningTypes: string[],
): string {
  const od = overdueTypes.length;
  const wa = warningTypes.length;
  if (od > 0 && wa > 0) {
    return `${od} atrasada(s), ${wa} próxima(s). Toque para abrir o Copilote.`;
  }
  if (od > 0) {
    if (od === 1) {
      return `${overdueTypes[0]}: manutenção atrasada. Abra o app para ver os km.`;
    }
    return `${od} manutenções atrasadas. Toque para ver no Copilote.`;
  }
  if (wa === 1) {
    return `${warningTypes[0]}: chegando na hora da revisão. Veja em Manutenção.`;
  }
  return `${wa} manutenções se aproximando. Toque para ver no Copilote.`;
}

type WebPushRpcRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: Date;
  updated_at: Date;
};

function mapWebPushRow(r: WebPushRpcRow) {
  return {
    id: r.id,
    userId: r.user_id,
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function runMaintenancePushCron(): Promise<MaintenancePushCronResult> {
  const result: MaintenancePushCronResult = {
    usersConsidered: 0,
    usersNotified: 0,
    subscriptionsRemoved: 0,
    errors: 0,
    skippedNoAlerts: 0,
    skippedCooldown: 0,
    skippedNotConfigured: false,
  };

  if (!isWebPushConfigured()) {
    result.skippedNotConfigured = true;
    return result;
  }

  const { rows: rawSubs } = await pool.query(
    "SELECT id, user_id, endpoint, p256dh, auth, created_at, updated_at FROM copilote_fn_cron_web_push_subscriptions()",
  );
  const subs = (rawSubs as WebPushRpcRow[]).map(mapWebPushRow);
  if (subs.length === 0) {
    return result;
  }

  const byUser = new Map<string, typeof subs>();
  for (const s of subs) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }

  const now = Date.now();

  for (const [userId, userSubs] of byUser) {
    result.usersConsidered += 1;

    const proceed = await runWithAppUserId(userId, async () => {
      const [vehicle] = await getRequestDb()
        .select()
        .from(vehicles)
        .where(eq(vehicles.userId, userId))
        .limit(1);

      const currentOdometer =
        vehicle !== undefined ? vehicle.currentOdometer : null;

      const itemsRows = await getRequestDb()
        .select()
        .from(maintenanceItems)
        .where(eq(maintenanceItems.userId, userId));

      const serialized = itemsRows.map((r) =>
        serializeMaintenanceItem(r, currentOdometer),
      );

      const overdue = serialized.filter((i) => i.status === "overdue");
      const warning = serialized.filter((i) => i.status === "warning");

      if (overdue.length === 0 && warning.length === 0) {
        return { kind: "no_alerts" as const };
      }

      const [lastLog] = await getRequestDb()
        .select({ createdAt: maintenancePushLog.createdAt })
        .from(maintenancePushLog)
        .where(eq(maintenancePushLog.userId, userId))
        .orderBy(desc(maintenancePushLog.createdAt))
        .limit(1);

      if (
        lastLog !== undefined &&
        now - lastLog.createdAt.getTime() < MAINTENANCE_PUSH_COOLDOWN_MS
      ) {
        return { kind: "cooldown" as const };
      }

      const body = buildMaintenanceBody(
        overdue.map((i) => i.type),
        warning.map((i) => i.type),
      );

      let anySent = false;
      for (const row of userSubs) {
        const sub = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };
        const send = await sendWebPushToSubscription(sub, {
          title: "Manutenção — Copilote",
          body,
          url: "/manutencao",
        });
        if (send.ok) {
          anySent = true;
        } else if (send.gone) {
          await getRequestDb()
            .delete(webPushSubscriptions)
            .where(eq(webPushSubscriptions.id, row.id));
          result.subscriptionsRemoved += 1;
        } else {
          result.errors += 1;
        }
      }

      if (anySent) {
        await getRequestDb().insert(maintenancePushLog).values({ userId });
        result.usersNotified += 1;
      }
      return { kind: "ok" as const };
    });

    if (proceed.kind === "no_alerts") result.skippedNoAlerts += 1;
    else if (proceed.kind === "cooldown") result.skippedCooldown += 1;
  }

  return result;
}
