import { notFound } from "next/navigation";
import SentryExampleClient from "./sentry-example-client";

/** Evita pré-render estático em build (NODE_ENV=production) antes do request real. */
export const dynamic = "force-dynamic";

export default function SentryExamplePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <SentryExampleClient />;
}
