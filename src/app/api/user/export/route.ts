import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import JSZip from "jszip";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import {
  expenses,
  goals,
  maintenanceItems,
  platformsUsed,
  rides,
  subscriptions,
  users,
  vehicles,
} from "@/db/schema";
import { requireSession } from "@/lib/api-session";

export const runtime = "nodejs";

function omitPasswordHash<T extends { passwordHash?: unknown }>(
  row: T,
): Omit<T, "passwordHash"> {
  const { passwordHash, ...rest } = row;
  void passwordHash;
  return rest;
}

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const userId = auth.userId;

  return runWithAppUserId(userId, async () => {
  const gdb = getRequestDb();
  const [
    userRows,
    vehicleRows,
    rideRows,
    expenseRows,
    goalRows,
    maintenanceRows,
    platformRows,
    subRows,
  ] = await Promise.all([
    gdb.select().from(users).where(eq(users.id, userId)),
    gdb.select().from(vehicles).where(eq(vehicles.userId, userId)),
    gdb.select().from(rides).where(eq(rides.userId, userId)),
    gdb.select().from(expenses).where(eq(expenses.userId, userId)),
    gdb.select().from(goals).where(eq(goals.userId, userId)),
    gdb.select().from(maintenanceItems).where(eq(maintenanceItems.userId, userId)),
    gdb.select().from(platformsUsed).where(eq(platformsUsed.userId, userId)),
    gdb.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
  ]);

  const user = userRows[0];
  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
      { status: 404 },
    );
  }

  const zip = new JSZip();
  const safeUser = omitPasswordHash(user);

  zip.file(
    "perfil.json",
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        user: safeUser,
        vehicles: vehicleRows,
        subscriptions: subRows,
        platformsUsed: platformRows,
      },
      null,
      2,
    ),
  );
  zip.file("corridas.json", JSON.stringify(rideRows, replacer, 2));
  zip.file("gastos.json", JSON.stringify(expenseRows, replacer, 2));
  zip.file("metas.json", JSON.stringify(goalRows, replacer, 2));
  zip.file("manutencao.json", JSON.stringify(maintenanceRows, replacer, 2));

  const buf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const filename = `copilote-export-${userId.slice(0, 8)}.zip`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
  });
}

function replacer(_key: string, value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}
