import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-session";

export const dynamic = "force-dynamic";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }

  Sentry.logger.info("Sentry example API called");
  throw new SentryExampleAPIError(
    "This error is raised on the backend called by the example page.",
  );
}
