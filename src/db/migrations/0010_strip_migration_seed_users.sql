-- Apaga os dois utilizadores inseridos pela migration legada `0002_seed_dev_users_piloto`.
-- Assim, em produção (ex.: Postgres novo no Easypanel) não ficam contas de dev na BD:
-- o primeiro acesso deve ser via BOOTSTRAP_SUPER_ADMIN + INITIAL_SUPER_ADMIN_* no painel.
-- Em desenvolvimento local: `npm run db:seed:dev-users` volta a criar as contas de teste.

DELETE FROM "users"
WHERE "id" IN (
  '11111111-1111-4111-8111-111111111101',
  '22222222-2222-4222-8222-222222222202'
);
