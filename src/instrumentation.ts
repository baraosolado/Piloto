import * as Sentry from "@sentry/nextjs";
import { logServerRequestCrash } from "@/lib/security-log-server-crash";

function requestPathFromOnRequestErrorArg(
  request: unknown,
): string | undefined {
  if (!request || typeof request !== "object") return;
  const r = request as { path?: string; url?: string };
  if (typeof r.path === "string" && r.path.length > 0) return r.path;
  if (typeof r.url === "string") {
    try {
      return new URL(r.url).pathname;
    } catch {
      return;
    }
  }
  return;
}

export const onRequestError: typeof Sentry.captureRequestError = (
  ...args: Parameters<typeof Sentry.captureRequestError>
) => {
  const err = args[0];
  const path = requestPathFromOnRequestErrorArg(args[1]);
  logServerRequestCrash(err, path);
  return Sentry.captureRequestError(...args);
};

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
