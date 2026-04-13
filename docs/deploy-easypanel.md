# Deploy em produção — Easypanel (VPS + Docker)

Este guia alinha o repositório ao fluxo **Git → build Docker → container** no Easypanel, com Postgres, variáveis de ambiente, health check e **crons** (a Vercel `vercel.json` **não** corre no VPS — use o agendador do Easypanel ou `scripts/run-cron-tasks.sh`).

## 1. Postgres

1. No Easypanel, crie um serviço **PostgreSQL** (ou use um externo).
2. Copie a **connection string** (`postgresql://...`) para `DATABASE_URL` na app.
3. Em Docker na mesma stack, o host costuma ser o **nome interno** do serviço (ex.: `postgres`), **não** `localhost`.

## 2. App (Dockerfile do repositório)

1. Novo serviço → **App** → repositório Git → **Dockerfile** na raiz.
2. **Porta interna:** `3000` (ou defina `PORT`; o `next start` escuta em `0.0.0.0`).
3. **Health check (recomendado):** HTTP GET `https://SEU_DOMINIO/api/health` ou, dentro da rede interna, `http://CONTAINER:3000/api/health` com intervalo 30s.

### Build args (obrigatórios no Easypanel → Build)

O `next build` importa módulos que leem estas variáveis. Use a **URL pública final** (HTTPS) e um segredo real de auth.

| Build arg | Exemplo | Notas |
|-----------|---------|--------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Pode ser a mesma do runtime; só precisa de formato válido no build. |
| `BETTER_AUTH_URL` | `https://app.seudominio.com.br` | **Sem** barra final; igual à URL pública da API. |
| `BETTER_AUTH_SECRET` | 32+ bytes aleatórios | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://app.seudominio.com.br` | Mesmo host que o browser usa. |

Opcionais no build: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (source maps).

### Variáveis de runtime (Container / Environment)

Copie de `.env.local.example` o que aplicar. **Mínimo para produção:**

- `DATABASE_URL` — igual ao Postgres real (acessível do container).
- `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` — iguais aos build args.
- `NODE_ENV=production`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (se usar pagamentos).
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (e-mail transacional).
- `CRON_SECRET` — `openssl rand -base64 32`; **obrigatório** se for agendar crons.
- `CRON_BASE_URL` (opcional) — URL pública `https://...` para `scripts/run-cron-tasks.sh`; se omitir, usa `NEXT_PUBLIC_APP_URL`.

Opcionais:

- `SKIP_DB_MIGRATE=1` — só se migrar a BD **fora** do container (por defeito o entrypoint corre `drizzle-kit migrate`).

### Primeiro `super_admin` (BD sem contas de dev)

As migrations **não** criam o utilizador `dev@piloto.local` nem senhas de desenvolvimento. Em produção o melhor fluxo é:

1. **Na primeira subida do container**, definir (Easypanel → Environment):
   - `BOOTSTRAP_SUPER_ADMIN=1`
   - `INITIAL_SUPER_ADMIN_EMAIL` — e-mail real do dono da operação
   - `INITIAL_SUPER_ADMIN_PASSWORD` — senha forte (mínimo 12 caracteres)
   - Opcional: `INITIAL_SUPER_ADMIN_NAME`
2. O `docker-entrypoint.sh` corre `drizzle-kit migrate` e, em seguida, `node scripts/bootstrap-super-admin.mjs` **só se** `BOOTSTRAP_SUPER_ADMIN=1`. O script é **idempotente**: se já existir qualquer `users.role = 'super_admin'`, não faz nada.
3. Após o primeiro login com sucesso, **remover** `BOOTSTRAP_SUPER_ADMIN`, `INITIAL_SUPER_ADMIN_EMAIL` e `INITIAL_SUPER_ADMIN_PASSWORD` do painel (não deixar a senha inicial nas variáveis do serviço).

**Login com “as variáveis do Easypanel” dá erro?**

- Confirme nos **logs do container** na arranque: deve aparecer `Primeiro super_admin criado` (sucesso) ou uma mensagem de erro (e-mail inválido, senha com menos de 12 caracteres, e-mail já registado). Com `set -e`, se o bootstrap falhar o contentor **não** chega a iniciar o Next.
- Se aparecer `Já existe super_admin — bootstrap ignorado`, as `INITIAL_*` **não** criaram utilizador neste deploy: faça login com a conta `super_admin` que já existe na base (ou use **Recuperar senha** com o e-mail certo).
- No formulário `/login`, use o **mesmo** e-mail e **mesma** senha que definiu em `INITIAL_*` (sem aspas no painel; evite espaços extra no fim da linha).
- `INITIAL_SUPER_ADMIN_PASSWORD` precisa de **mínimo 12 caracteres** (regra do script de bootstrap).

**Alterar e-mail e senha depois:** o Better Auth já suporta **recuperação de senha** (`/recuperar-senha`) e **troca de e-mail** com confirmação por link (Resend). Em **Configurações → Perfil** o utilizador altera nome/cidade; e-mail/senha seguem os fluxos do auth (e-mail transacional requer `RESEND_API_KEY` em produção).

**Alternativa manual** (sem variável no container): a partir de uma máquina com `DATABASE_URL`, `npm run db:bootstrap:super-admin` com os mesmos `INITIAL_*` no ambiente ou `.env.local`.

**Erro `relation "users" does not exist` após migrate OK:** o entrypoint corre `node scripts/verify-db-schema.mjs` — se falhar, o contentor não arranca o Next (evita login em loop). Causa típica: journal `__drizzle_migrations` dessincronizado (migrate “OK” mas tabelas em falta). Na consola SQL do Postgres (só com backup / BD descartável): `DROP TABLE IF EXISTS public.__drizzle_migrations CASCADE;` e reinicie o serviço. **Não precisa de `.env.local` no Easypanel** — basta `DATABASE_URL` (e opcionalmente `.env`) no painel; ficheiros em `/app` só são lidos se existirem.

**Reset da BD no contentor (após rebuild da imagem):** o Dockerfile inclui `scripts/reset-db-dev.mjs`. Com shell/exec no serviço da app: `CONFIRM_RESET_DB=yes npm run db:reset` e depois `npm run db:migrate` (ou reiniciar o serviço para o entrypoint aplicar migrations). Sem rebuild, o ficheiro não existe em `/app/scripts/`.

**Crons a correr dentro do mesmo container** (Easypanel “Run in container”): use `CRON_BASE_URL=http://127.0.0.1:3000` (ou a `PORT` exposta) para evitar hairpin DNS para o domínio público.
- Push: `VAPID_*`, etc.
- `SECURITY_LOG_INGEST_URL` / `SECURITY_LOG_INGEST_TOKEN`
- `DATA_RETENTION_CRON_ENABLED=1` — só após decisão jurídica (o cron responde `enabled: false` sem isto).

## 3. Domínio e TLS

- No Easypanel, associe o domínio e ative **HTTPS** (proxy reverso do painel ou certificado próprio).
- `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL` devem ser **exatamente** o URL público (esquema + host), para cookies e CORS.

## 4. Stripe

- Webhook: `https://SEU_DOMINIO/api/webhooks/stripe`
- Eventos necessários conforme `SECURITY.md` / código do webhook.

## 5. Crons (obrigatório no VPS; não usa `vercel.json`)

Duas rotas protegidas com `Authorization: Bearer CRON_SECRET` ou header `x-cron-secret`:

| Rota | Função |
|------|--------|
| `POST /api/cron/maintenance-push` | Push de lembretes de manutenção |
| `POST /api/cron/data-retention` | Anonimização (opt-in `DATA_RETENTION_CRON_ENABLED`) |

**Easypanel — Scheduled job (recomendado):**

- **Diário** (ex. 13:00 UTC): comando que chama só maintenance-push, ou o script completo.
- **Mensal** (ex. dia 3): `data-retention` (pode ser o mesmo script).

Exemplo com script no repositório (o servidor precisa de `curl` e `bash`; no container Debian/Alpine do Node já costuma haver `curl` no host Easypanel):

```bash
cd /caminho/do/repo && bash scripts/run-cron-tasks.sh
```

Ou dois jobs separados com `curl`:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" "$NEXT_PUBLIC_APP_URL/api/cron/maintenance-push"
```

## 6. Deploy sem Easypanel (PM2 no VPS)

Ver `scripts/deploy.sh`, `scripts/setup-vps.sh`, `nginx/copilote.conf` e `ecosystem.config.js`.

## 6b. RLS e backup no servidor (mesmo fora do Easypanel)

- **RLS:** `CONFIRM_RLS_APPLY=1 DATABASE_URL=... bash scripts/apply-rls.sh` (só após plano em `SECURITY-GAPS` §1). Smoke: `bash scripts/verify-rls.sh`.
- **Backup:** `bash scripts/install-backup-cron.sh` (ajuste `APP_DIR` se preciso). Restore: `bash scripts/restore-backup.sh ficheiro.sql.gz`.
- **PM2:** `bash scripts/pm2-setup-logrotate.sh` e `bash scripts/pm2-persist.sh`.

## 7. Checklist rápido antes de abrir ao público

- [ ] `DATABASE_URL` acessível do container; migrations aplicadas (logs do entrypoint ou `drizzle-kit migrate`).
- [ ] `BETTER_AUTH_URL` = URL real HTTPS.
- [ ] Stripe webhook a apontar para produção e `whsec_` correto.
- [ ] E-mail (Resend) a enviar com domínio verificado.
- [ ] `CRON_SECRET` definido e job a bater nas rotas `/api/cron/*`.
- [ ] Health `/api/health` 200 atrás do proxy.
- [ ] (Opcional) RLS aplicado e `bash scripts/verify-rls.sh` OK — ver `SECURITY-GAPS.md` §1.
