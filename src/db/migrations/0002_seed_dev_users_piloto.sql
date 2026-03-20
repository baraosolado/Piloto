-- Contas de desenvolvimento (Better Auth: credential + senha em accounts.password)
-- Login: /login
--   emersonlincoln4@gmail.com / PilotoDev2026!
--   motorista@piloto.local / PilotoUser2026!

DELETE FROM users WHERE email IN ('dev@piloto.local', 'gamejogo123456@gmail.com', 'emersonlincoln4@gmail.com', 'motorista@piloto.local');

INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at) VALUES
  ('11111111-1111-4111-8111-111111111101', 'Dev Piloto', 'emersonlincoln4@gmail.com', NULL, true, now(), now()),
  ('22222222-2222-4222-8222-222222222202', 'João Motorista', 'motorista@piloto.local', NULL, true, now(), now());

INSERT INTO accounts (id, provider_id, account_id, user_id, password, created_at, updated_at) VALUES
  (gen_random_uuid(), 'credential', '11111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111101', '4a54fe311f4fbc4085dc1a24154ced59:bff43f33e5bd2deda44d3cbc3253020af3a9a16030dda173bc66f3d20282e5ffbef70e50524351d1f2d5edc7975869c03c099ca41d4c96552fe35edc2f9e4497', now(), now()),
  (gen_random_uuid(), 'credential', '22222222-2222-4222-8222-222222222202', '22222222-2222-4222-8222-222222222202', '1dad34ff749a810500873b1685e022e9:cef233f08c21db9d6c14f4b5c7f7fe9b0eb82549834a466824f678e76d93f33475f64be45b45051f3360588b2dabb259021e9ae6072f8777ad070a0dea574109', now(), now());
