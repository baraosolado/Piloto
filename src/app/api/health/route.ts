import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Health check para Easypanel, Docker, load balancer e monitorização (sem auth). */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
