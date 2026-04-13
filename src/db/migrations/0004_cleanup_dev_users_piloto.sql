-- Cleanup de contas de desenvolvimento para produção pública
-- Evita que logins/senhas de dev fiquem acessíveis após o seed inicial.

DELETE FROM users
WHERE email IN (
  'dev@piloto.local',
  'dev@copilote.local',
  'gamejogo123456@gmail.com',
  'emersonlincoln4@gmail.com',
  'motorista@piloto.local',
  'motorista@copilote.local'
);
