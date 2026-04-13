import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

function buildContentSecurityPolicy(): string {
  const directives: string[] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.network",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  ];

  const connectParts = [
    "'self'",
    "https://api.stripe.com",
    "https://*.stripe.com",
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
    "https://*.sentry.io",
  ];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const u = new URL(appUrl);
      connectParts.push(`${u.protocol}//${u.host}`);
    } catch {
      /* ignore */
    }
  }
  directives.push(`connect-src ${connectParts.join(" ")}`);

  return directives.join("; ");
}

const securityHeaders: { key: string; value: string }[] = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.splice(1, 0, {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  /** Evita empacotar `cluster`/Node dentro de bundles que não o suportam (ex.: Edge). */
  serverExternalPackages: ["rate-limiter-flexible"],
  /** SECURITY.md §4.5 / §12.9 — não expor código-fonte no navegador em produção. */
  productionBrowserSourceMaps: false,
  // Evita aviso "Webpack is configured while Turbopack is not" no `next dev --turbopack`:
  // o Sentry injeta webpack no build; declarar `turbo` vazio indica uso consciente do Turbopack em dev.
  experimental: {
    turbo: {},
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

/** Mesmos org/projeto do `npx @sentry/wizard -i nextjs --org piloto --project javascript-nextjs` */
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "piloto",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
