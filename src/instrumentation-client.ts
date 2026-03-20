import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
