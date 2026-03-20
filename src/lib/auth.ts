import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  sendChangeEmailVerificationEmail,
  sendPasswordResetEmail,
  sendVerificationEmailMessage,
} from "@/lib/email";

const baseURL = process.env.BETTER_AUTH_URL;
const secret = process.env.BETTER_AUTH_SECRET;

if (!baseURL) {
  throw new Error("BETTER_AUTH_URL não está definida");
}
if (!secret) {
  throw new Error("BETTER_AUTH_SECRET não está definida");
}

export const auth = betterAuth({
  // Colunas `id` no Postgres são uuid: o padrão do Better Auth é generateId() (32 chars a-zA-Z0-9),
  // o que quebra INSERT em sessions (e outros). UUIDs estáveis para todos os modelos.
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  secret,
  baseURL,
  trustedOrigins: [
    baseURL,
    ...(process.env.NEXT_PUBLIC_APP_URL &&
    process.env.NEXT_PUBLIC_APP_URL !== baseURL
      ? [process.env.NEXT_PUBLIC_APP_URL]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name?.trim() || user.email,
        resetLink: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: false,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendVerificationEmailMessage({
          to: user.email,
          name: user.name?.trim() || user.email,
          verificationLink: url,
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Não foi possível enviar o e-mail.";
        throw new APIError("BAD_REQUEST", { message });
      }
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, newEmail, url }) => {
        try {
          await sendChangeEmailVerificationEmail({
            to: user.email,
            name: user.name?.trim() || user.email,
            newEmail,
            confirmLink: url,
          });
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Não foi possível enviar o e-mail.";
          throw new APIError("BAD_REQUEST", { message });
        }
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 15 * 60,
    max: 5,
  },
  plugins: [nextCookies()],
});
