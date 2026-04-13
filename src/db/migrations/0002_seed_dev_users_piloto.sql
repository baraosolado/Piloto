-- Contas de desenvolvimento (Better Auth: credential + senha em accounts.password).
-- A migration `0010_strip_migration_seed_users` remove estes registos após aplicar o histórico,
-- para produção não ficar com utilizadores de dev; em local: `npm run db:seed:dev-users`.
-- Referência dev (apenas documentação): emersonlincoln4@gmail.com / CopiloteDev2026! ; motorista@copilote.local / CopiloteUser2026!

DELETE FROM users WHERE email IN ('dev@piloto.local', 'dev@copilote.local', 'gamejogo123456@gmail.com', 'emersonlincoln4@gmail.com', 'motorista@piloto.local', 'motorista@copilote.local');

INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at) VALUES
  ('11111111-1111-4111-8111-111111111101', 'Dev Copilote', 'emersonlincoln4@gmail.com', NULL, true, now(), now()),
  ('22222222-2222-4222-8222-222222222202', 'João Motorista', 'motorista@copilote.local', NULL, true, now(), now());

INSERT INTO accounts (id, provider_id, account_id, user_id, password, created_at, updated_at) VALUES
  (gen_random_uuid(), 'credential', '11111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111101', 'cdb7c0e73a61d2114eced6db4b2df0c9:5a3991b5fb831efa6a819126e30448576d3a37fe9f241eafed68815b1394bbf5a66fe8113468a8bc38dd6a1527bec8e5f8d958161e967954358f74870c8f2926', now(), now()),
  (gen_random_uuid(), 'credential', '22222222-2222-4222-8222-222222222202', '22222222-2222-4222-8222-222222222202', '246d791073df3be2caf9245745ec3df1:b4a7997b2c9f8652b780b7f2502d24332353328865eb0a99b2f72bfe0b399c62703dbcac5ce61f635a802a38f0288a15680a3dcc3956d5d552bc491e090bb5ae', now(), now());
