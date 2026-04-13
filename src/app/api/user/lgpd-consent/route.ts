import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getRequestDb } from "@/db/request-db";
import { runWithAppUserId } from "@/db/run-with-app-user-id";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/api-session";

/** Estado do consentimento LGPD (privacidade + termos) para a conta autenticada. */
export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  return runWithAppUserId(auth.userId, async () => {
    const rows = await getRequestDb()
      .select({ lgpdConsentAcceptedAt: users.lgpdConsentAcceptedAt })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    const at = rows[0]?.lgpdConsentAcceptedAt ?? null;
    return NextResponse.json({
      data: { acceptedAt: at ? at.toISOString() : null },
      error: null,
    });
  });
}

/**
 * Grava `lgpd_consent_accepted_at` na primeira vez (idempotente).
 * Chamado após cadastro com sessão já criada; pode repetir-se em Configurações se falhar antes.
 */
export async function POST() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  return runWithAppUserId(auth.userId, async () => {
    const gdb = getRequestDb();
    const [updated] = await gdb
      .update(users)
      .set({ lgpdConsentAcceptedAt: new Date() })
      .where(
        and(eq(users.id, auth.userId), isNull(users.lgpdConsentAcceptedAt)),
      )
      .returning({ lgpdConsentAcceptedAt: users.lgpdConsentAcceptedAt });

    if (updated?.lgpdConsentAcceptedAt) {
      return NextResponse.json({
        data: {
          ok: true as const,
          recorded: true as const,
          acceptedAt: updated.lgpdConsentAcceptedAt.toISOString(),
        },
        error: null,
      });
    }

    const existing = await gdb
      .select({ lgpdConsentAcceptedAt: users.lgpdConsentAcceptedAt })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    const at = existing[0]?.lgpdConsentAcceptedAt;
    if (at) {
      return NextResponse.json({
        data: {
          ok: true as const,
          recorded: false as const,
          acceptedAt: at.toISOString(),
        },
        error: null,
      });
    }

    return NextResponse.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Utilizador não encontrado." },
      },
      { status: 404 },
    );
  });
}
