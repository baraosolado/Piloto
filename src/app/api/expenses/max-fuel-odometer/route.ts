import { NextResponse } from "next/server";
import { z } from "zod";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { requireSession } from "@/lib/api-session";
import { getMaxFuelOdometerExcluding } from "@/lib/max-fuel-odometer";

const querySchema = z.object({
  excludeId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Parâmetros inválidos." },
      },
      { status: 400 },
    );
  }

  return runWithAppUserId(userId, async () => {
  const maxOdometer = await getMaxFuelOdometerExcluding(
    userId,
    parsed.data.excludeId ?? null,
  );

  return NextResponse.json({
    data: { maxOdometer },
    error: null,
  });
  });
}
