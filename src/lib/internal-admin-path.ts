/**
 * Caminho do painel mestre (super_admin). Não consta na navegação da app.
 * Para alterar o URL, actualize também o `matcher` em `src/middleware.ts`.
 */
export const INTERNAL_ADMIN_BASE_PATH = "/mestre" as const;
