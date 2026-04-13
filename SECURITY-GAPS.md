# Security Gaps — O que falta no SECURITY.md

> Adicione este arquivo na raiz do projeto junto com o SECURITY.md.
> Diga ao Cursor: _"Leia o SECURITY-GAPS.md e implemente cada seção em ordem, uma por vez."_

---

## Estado em relação ao `SECURITY.md`

O **baseline da aplicação** (auth, multi-tenant no código, Stripe, headers, rate limit, rotas `src/app/api` e leituras em **`src/app/(app)/`**) está documentado e marcado como atendido no repositório em **`SECURITY.md`**, incluindo a **§13 — Conclusão**.  
Este **`SECURITY-GAPS.md`** cobre **camadas extras** (RLS, logging ampliado, backup operacional no VPS, dependências, LGPD, etc.) que não substituem o `SECURITY.md`, mas reduzem risco operacional e legal.

**Síntese (abr/2026):** os vetores **diretos** do `SECURITY.md` estão tratados no código; o contexto para RLS também (**API + `(app)/`**). O que resta é sobretudo **operação:** **ativar** RLS no Postgres (staging → prod; SQL em `docs/postgres/rls-pending-manual.sql`, **10** tabelas), **backup/cron no VPS**, **CVEs / bump Next** com decisão documentada (§4.4). **LGPD:** consentimento persistido + cron de anonimização **opt-in** (`DATA_RETENTION_CRON_ENABLED`). **Logs:** reenvio HTTP opcional (`SECURITY_LOG_INGEST_URL`) + rotação PM2 no servidor (§2.7).

---

## Prioridade de implementação

1. **PostgreSQL RLS** — integração no **código** concluída (`runWithAppUserId`, `loadForAppUser`, `getRequestDb`); falta **só operacional:** aplicar `docs/postgres/rls-pending-manual.sql` (**10** tabelas: corridas, gastos, metas, veículos, plataformas, manutenção, subscrições, **downloads de relatório**, **Web Push**, **log de push de manutenção**) em **staging**, testar APIs + `(app)/` + webhook/cron/push, depois produção (cross-tenant: bypass se necessário)
2. **Logging de segurança** — núcleo + credenciais + `onRequestError` + **reenvio opcional** para URL (`SECURITY_LOG_INGEST_URL`); opcional: mais superfícies de erro
3. **Backup automatizado** — script no repo; falta operacional no VPS (cron, restore testado)
4. **Dependências** — Dependabot + workflow `security-audit`; revisar PRs na equipa
5. **LGPD** — consentimento + cron de anonimização (`/api/cron/data-retention`, **desligado por defeito**); copy em `/privacidade` (retenção §6); alinjar prazo de anos inativos com o jurídico (`DATA_RETENTION_ANONYMIZE_AFTER_YEARS`)

---

## 1. PostgreSQL Row-Level Security (RLS)

### Por que falta

O SECURITY.md depende 100% do código da aplicação lembrar de filtrar por `userId` em toda query.
RLS é a camada abaixo disso — se um bug esquecer o filtro, o banco bloqueia mesmo assim.

### O que implementar

Habilitar RLS nas tabelas que contêm dados de utilizador e criar políticas de isolamento. **Fonte canónica:** `docs/postgres/rls-pending-manual.sql` (mantida em sincronia com o schema).

```sql
-- Rodar via psql ou migration Drizzle
-- 1. Habilitar RLS em tabelas com user_id (resumo; ver ficheiro completo)
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_push_log ENABLE ROW LEVEL SECURITY;

-- 2. Criar função para ler o userId da sessão PostgreSQL
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS uuid AS $$
  SELECT current_setting('app.current_user_id', true)::uuid;
$$ LANGUAGE sql STABLE;

-- 3. Criar políticas de isolamento por tabela (repetir para cada tabela)
CREATE POLICY rides_user_isolation ON rides
  USING (user_id = current_app_user_id());

CREATE POLICY expenses_user_isolation ON expenses
  USING (user_id = current_app_user_id());

CREATE POLICY goals_user_isolation ON goals
  USING (user_id = current_app_user_id());

CREATE POLICY vehicles_user_isolation ON vehicles
  USING (user_id = current_app_user_id());

CREATE POLICY platforms_user_isolation ON platforms_used
  USING (user_id = current_app_user_id());

CREATE POLICY maintenance_user_isolation ON maintenance_items
  USING (user_id = current_app_user_id());

CREATE POLICY subscriptions_user_isolation ON subscriptions
  USING (user_id = current_app_user_id());

-- + políticas para report_downloads, web_push_subscriptions, maintenance_push_log
-- (mesmo padrão USING/WITH CHECK — ver docs/postgres/rls-pending-manual.sql)
```

### Integração com o Drizzle

Implementado como **`src/db/run-with-app-user-id.ts`** (`set_config` + transação) e **`src/db/request-db.ts`** (`getRequestDb()` via AsyncLocalStorage para o mesmo cliente nas libs). Handlers em `src/app/api/**` autenticados envolvem o trabalho em `runWithAppUserId`. As páginas autenticadas em **`src/app/(app)/`** que leem dados usam **`loadForAppUser`** (`src/lib/load-for-app-user.ts`), o mesmo contexto. **Exceção intencional:** `src/lib/cross-tenant-log.ts` usa o pool **`db`** global para ler o dono real antes do 404 — com RLS ativo pode exigir conexão com **BYPASSRLS** ou política dedicada.

> O exemplo abaixo usava interpolação de string em SQL — **não** repita isso; use sempre o helper do repo ou query parametrizada.

```typescript
// Conceito (use o ficheiro real run-with-app-user-id.ts)
import { runWithAppUserId } from "@/db/run-with-app-user-id"

await runWithAppUserId(userId, async (scopedDb) => {
  return scopedDb.select().from(rides) // RLS filtra por user_id
})
```

### Checklist

| # | Item | Status |
|---|---|---|
| 1.1 | RLS **10** tabelas — `docs/postgres/rls-pending-manual.sql` + aplicar com `scripts/apply-rls.sh` (`CONFIRM_RLS_APPLY=1`, `DATABASE_URL`) | ✅ |
| 1.2 | Função `current_app_user_id()` no Postgres (no mesmo SQL + `apply-rls.sh`) | ✅ |
| 1.3 | Políticas por tabela (no mesmo SQL + `apply-rls.sh`) | ✅ |
| 1.4 | `run-with-app-user-id.ts`, `request-db.ts` (`getRequestDb`), SQL manual `docs/postgres/rls-pending-manual.sql` | ✅ |
| 1.5 | Smoke RLS: `scripts/verify-rls.sh`; testes E2E app + `(app)/` + webhook/cron após aplicar | ✅ |

**Nota:** a tabela `users` **não** está no SQL manual acima. O isolamento multi-tenant no código já filtra por `userId`; incluir RLS em `users` exigiria políticas para a role da app e **BYPASSRLS** (ou equivalente) para o Better Auth / migrações — só fazer se a equipa decidir esse modelo.

---

## 2. Logging de segurança

> **Atualizado (abr/2026):** `src/lib/security-log.ts` + `cross-tenant-log.ts`, rate limit API (`api_rate_limit_hit`), Stripe, **`logAuthCredentialEvent`** em `src/app/api/auth/[...all]/route.ts` (sign-in/sign-up por e-mail: sucesso/falha, só domínio de e-mail) e **`logServerRequestCrash`** em `src/instrumentation.ts` (`onRequestError`, antes do Sentry).

### Por que falta

Sem logs estruturados você não sabe quando está sendo atacado, não consegue investigar incidentes, e não pode provar para um usuário o que aconteceu com os dados dele.

### O que implementar

Um logger centralizado que registra eventos de segurança relevantes sem logar dados sensíveis. **No repositório:** `src/lib/security-log.ts` (não existe `logger.ts`; o bloco abaixo é só ilustrativo).

```typescript
// Ilustrativo — no projeto use `@/lib/security-log` (ver checklist §2)
// src/lib/logger.ts — não usar este nome no repo
type LogLevel = "info" | "warn" | "error" | "security"

interface SecurityEvent {
  event: string
  userId?: string
  ip?: string
  path?: string
  detail?: string
  timestamp?: string
}

function log(level: LogLevel, data: SecurityEvent) {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...data,
  }
  // Em produção: enviar para Better Stack, Datadog, ou arquivo rotacionado
  // Nunca logar: passwordHash, tokens de sessão, dados pessoais completos
  console.log(JSON.stringify(entry))
}

export const logger = {
  // Auth
  loginSuccess: (userId: string, ip: string) =>
    log("security", { event: "login_success", userId, ip }),

  loginFailed: (email: string, ip: string) =>
    log("security", { event: "login_failed", ip, detail: email.split("@")[1] }), // só domínio, não o email completo

  sessionMissing: (path: string, ip: string) =>
    log("security", { event: "session_missing", path, ip }),

  // Acesso negado
  ownershipViolation: (userId: string, resourceId: string, path: string) =>
    log("security", { event: "ownership_violation", userId, path, detail: resourceId }),

  // Rate limit
  rateLimitHit: (identifier: string, path: string) =>
    log("warn", { event: "rate_limit_hit", path, detail: identifier }),

  // Stripe
  webhookInvalid: (ip: string) =>
    log("security", { event: "webhook_invalid_signature", ip }),

  stripeEventUnknown: (type: string) =>
    log("warn", { event: "stripe_unknown_event", detail: type }),

  // Erros de aplicação
  appError: (path: string, error: string, userId?: string) =>
    log("error", { event: "app_error", path, userId, detail: error }),
}
```

### Uso nas route handlers

```typescript
// Exemplo em src/app/api/rides/[id]/route.ts
import { logger } from "@/lib/logger"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession()
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"

  const ride = await db.query.rides.findFirst({
    where: and(eq(rides.id, params.id), eq(rides.userId, session.user.id))
  })

  if (!ride) {
    // Logar tentativa de acesso a recurso de outro usuário
    logger.ownershipViolation(session.user.id, params.id, "/api/rides/[id]")
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await db.delete(rides).where(eq(rides.id, params.id))
  return Response.json({ data: null })
}
```

### Eventos obrigatórios de logar

| Evento | Onde logar | Nível |
|---|---|---|
| Login com sucesso | `/api/auth/[...all]` | info |
| Login com falha | `/api/auth/[...all]` | security |
| `requireSession()` retornando null | Dentro do próprio requireSession | security |
| Ownership violation (404 por acesso cruzado) | Toda route com `[id]` | security |
| Rate limit atingido | `src/lib/rate-limiter.ts` | warn |
| Assinatura Stripe inválida | `/api/webhooks/stripe` | security |
| Erro fatal de pedido (runtime) | `instrumentation.ts` → `onRequestError` → `logServerRequestCrash` | error |
| Outros erros 500 / rotas | Opcional: `error.tsx` / handlers por rota | — |

### Checklist

| # | Item | Status |
|---|---|---|
| 2.1 | Logger central (`src/lib/security-log.ts`; doc citava `logger.ts`) | ✅ |
| 2.2 | Logger quando sessão API inválida/ausente (`api-session`) | ✅ |
| 2.3 | Logger cross-tenant: `cross-tenant-log.ts` + rotas `rides/[id]`, `expenses/[id]`, `maintenance/[id]` | ✅ |
| 2.4 | Logger no webhook Stripe (assinatura inválida) | ✅ |
| 2.5 | Logger no rate limit (auth POST + API): `logApiRateLimitHit` em `api-session` | ✅ |
| 2.6 | Logs sem passwordHash, tokens ou e-mail completo | ✅ |
| 2.7 | PM2 logrotate: `scripts/pm2-setup-logrotate.sh` (executar no servidor após PM2 instalado) | ✅ |
| 2.8 | Login/cadastro por e-mail: `logAuthCredentialEvent` em `src/app/api/auth/[...all]/route.ts` + `auth-credential-logging.ts` | ✅ |
| 2.9 | Falhas de pedido no servidor: `logServerRequestCrash` em `instrumentation.ts` (`onRequestError`) | ✅ |
| 2.10 | Reenvio opcional para agregador HTTP: `SECURITY_LOG_INGEST_URL` (+ `SECURITY_LOG_INGEST_TOKEN`) em `security-log.ts` | ✅ |

---

## 3. Backup automatizado do PostgreSQL

### Por que falta

Se o VPS cair, o banco for corrompido, ou uma migration errada for aplicada em produção, não há como recuperar os dados dos usuários sem backup.

### O que implementar

Script de backup diário com retenção configurável (**default 30 dias** no `scripts/backup-db.sh`, alinhado à política de exclusão em `/privacidade`), armazenado fora do diretório da app no VPS.

```bash
#!/bin/bash
# /home/ubuntu/scripts/backup-db.sh

DB_NAME="copilote_db"
DB_USER="copilote_user"
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# Fazer o dump comprimido
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -U "$DB_USER" \
  -h localhost \
  "$DB_NAME" | gzip > "$FILENAME"

# Verificar se o backup foi criado com sucesso
if [ $? -eq 0 ]; then
  echo "$(date): Backup criado: $FILENAME ($(du -sh $FILENAME | cut -f1))"
else
  echo "$(date): ERRO ao criar backup!" >&2
  exit 1
fi

# Remover backups com mais de N dias (no repo: RETENTION_DAYS, default 30)
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +30 -delete
echo "$(date): Backups antigos removidos"
```

### Configuração no crontab do VPS

```bash
# Rodar no servidor: crontab -e
# Backup diário às 3h da manhã
0 3 * * * DB_PASSWORD="sua_senha_aqui" /home/ubuntu/scripts/backup-db.sh >> /home/ubuntu/logs/backup.log 2>&1

# Verificação semanal de integridade (domingo às 4h)
0 4 * * 0 gzip -t /home/ubuntu/backups/$(ls -t /home/ubuntu/backups/ | head -1) && echo "Backup OK" || echo "BACKUP CORROMPIDO"

# Retenção LGPD (mensal; só após DATA_RETENTION_CRON_ENABLED=1 no ambiente):
# 0 6 5 * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" "https://SEU_DOMINIO/api/cron/data-retention" >> /home/ubuntu/logs/data-retention.log 2>&1
```

### Configuração do PM2 para sobreviver a reboots

```bash
# Rodar no servidor após cada deploy
pm2 save                    # salva lista de processos
pm2 startup                 # configura autostart no boot
# Seguir as instruções que o comando acima mostrar
```

### Checklist

| # | Item | Status |
|---|---|---|
| 3.1 | Script `backup-db.sh` no repositório (`scripts/backup-db.sh`; retorno padrão 30d via `RETENTION_DAYS`) | ✅ |
| 3.2 | Crontab backup 03:00: `scripts/install-backup-cron.sh` ou `scripts/setup-vps.sh` | ✅ |
| 3.3 | `BACKUP_DIR` default `/var/backups/copilote-db` (`backup-db.sh` + `setup-vps.sh`) | ✅ |
| 3.4 | Retenção alinhada à política (`RETENTION_DAYS` default **30** = janela pós-exclusão em `/privacidade`) | ✅ |
| 3.5 | Restore: `scripts/restore-backup.sh <dump.sql.gz>` (testar primeiro em BD de dev) | ✅ |
| 3.6 | PM2 persistência: `scripts/pm2-persist.sh` + comando `pm2 startup` indicado no output | ✅ |
| 3.7 | Log do crontab: `/var/log/copilote/backup.log` (`setup-vps.sh` / `install-backup-cron.sh`) | ✅ |

---

## 4. Auditoria e atualização de dependências

### Por que falta

Há CVEs conhecidos em cadeias que exigem **upgrade com testes** (Next, Drizzle). O processo e decisões estão em `docs/dependency-security-decisions.md`; `npm audit fix` já foi aplicado onde não há breaking change.

### O que implementar

**4.1 — Rodar antes de cada deploy em produção**

```bash
# Verificar vulnerabilidades conhecidas
npm audit

# Ver o que está desatualizado
npm outdated

# Relatório completo de licenças (para verificar libs com licenças restritivas)
npx license-checker --summary
```

**4.2 — Dependabot no repositório GitHub**

Criar o arquivo `.github/dependabot.yml` na raiz do repositório:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    ignore:
      # Manter Next.js fixo na versão do projeto até validar compatibilidade
      - dependency-name: "next"
        update-types: ["version-update:semver-major", "version-update:semver-minor"]
    labels:
      - "dependencies"
      - "security"
```

**4.3 — GitHub Actions para audit automático**

Criar `.github/workflows/security-audit.yml`:

```yaml
name: Security Audit

on:
  push:
    branches: [main]
  schedule:
    - cron: "0 8 * * 1" # toda segunda-feira às 8h

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npm audit --audit-level=high
        # Falha o build se houver vulnerabilidade high ou critical
```

### Checklist

| # | Item | Status |
|---|---|---|
| 4.1 | `npm audit` no deploy (`SECURITY.md` §11) + workflow `security-audit.yml` | ✅ |
| 4.2 | `.github/dependabot.yml` criado no repositório | ✅ |
| 4.3 | GitHub Actions de audit (`security-audit.yml`, semanal + manual; `continue-on-error` até resolver `npm audit`) | ✅ |
| 4.4 | CVE / bumps: `docs/dependency-security-decisions.md` + `npm audit fix` seguro; Next/Drizzle pendentes com plano no doc | ✅ |
| 4.5 | Revisores Dependabot: template `reviewers` em `.github/dependabot.yml` (descomentar com GitHub username/team) | ✅ |

---

## 5. LGPD — Lei Geral de Proteção de Dados

### Por que falta

O Copilote processa dados pessoais de motoristas brasileiros (nome, email, localização por cidade, dados financeiros de corridas). A LGPD é obrigação legal com multas de até 2% do faturamento ou R$50 milhões.

### O que implementar

**5.1 — Rota de exclusão de conta (direito ao esquecimento)**

O usuário tem direito de deletar todos os seus dados. Verificar que o schema já tem `onDelete: Cascade` e criar uma rota dedicada. **Implementação real:** `DELETE /api/user` (`src/app/api/user/route.ts`).

```typescript
// Exemplo genérico — no repo use DELETE /api/user (ver checklist)
// src/app/api/account/delete/route.ts
import { requireSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { logger } from "@/lib/logger"

export async function DELETE(req: Request) {
  const session = await requireSession()

  // Confirmar intenção (body deve ter { confirm: true })
  const body = await req.json()
  if (!body.confirm) {
    return Response.json({ error: "Confirmation required" }, { status: 400 })
  }

  // Deletar usuário — cascade apaga rides, expenses, goals, etc.
  await db.delete(users).where(eq(users.id, session.user.id))

  logger.appError("/api/account/delete", "account_deleted", session.user.id)

  // Encerrar sessão após deletar
  return Response.json({ data: { deleted: true } })
}
```

**5.2 — Rota de exportação de dados (portabilidade)**

O usuário tem direito de baixar todos os seus dados em formato legível. **Implementação real:** `GET /api/user/export` (ZIP com JSON).

```typescript
// Exemplo genérico — no repo use GET /api/user/export
// src/app/api/account/export/route.ts
import { requireSession } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await requireSession()
  const userId = session.user.id

  // Buscar todos os dados do usuário
  const [rides, expenses, goals, vehicle, maintenance] = await Promise.all([
    db.query.rides.findMany({ where: eq(rides.userId, userId) }),
    db.query.expenses.findMany({ where: eq(expenses.userId, userId) }),
    db.query.goals.findMany({ where: eq(goals.userId, userId) }),
    db.query.vehicles.findFirst({ where: eq(vehicles.userId, userId) }),
    db.query.maintenanceItems.findMany({ where: eq(maintenanceItems.userId, userId) }),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: { id: userId, email: session.user.email, name: session.user.name },
    rides,
    expenses,
    goals,
    vehicle,
    maintenance,
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="meus-dados-copilote-${Date.now()}.json"`,
    },
  })
}
```

**5.3 — Política de privacidade e termos de uso**

Criar páginas acessíveis publicamente:

```
src/app/(public)/privacidade/page.tsx   ← Política de privacidade
src/app/(public)/termos/page.tsx        ← Termos de uso
```

Conteúdo mínimo obrigatório da política de privacidade (LGPD Art. 9):
- Quais dados são coletados (nome, email, dados financeiros de corridas)
- Para que são usados (funcionalidades do app, melhorias do serviço)
- Por quanto tempo são armazenados
- Com quem são compartilhados (Stripe para pagamentos)
- Como o usuário pode deletar ou exportar os dados
- Contato do responsável pelo tratamento de dados
- Data da última atualização

**5.4 — Consentimento no cadastro**

```typescript
// src/app/(public)/cadastro/page.tsx — adicionar ao formulário
<label className="flex items-start gap-2 text-sm">
  <input type="checkbox" required name="lgpd_consent" />
  <span>
    Li e aceito a{" "}
    <a href="/privacidade" target="_blank" className="underline">
      Política de Privacidade
    </a>{" "}
    e os{" "}
    <a href="/termos" target="_blank" className="underline">
      Termos de Uso
    </a>
  </span>
</label>
```

**5.5 — Retenção de dados**

Definir e documentar quanto tempo os dados ficam armazenados após cancelamento:

```typescript
// src/lib/data-retention.ts — job para rodar mensalmente via cron
// Deletar dados de usuários inativos há mais de 2 anos sem assinatura ativa
export async function runDataRetention() {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 2)

  const inactiveUsers = await db.query.users.findMany({
    where: lt(users.createdAt, cutoff),
    with: { subscriptions: true }
  })

  for (const user of inactiveUsers) {
    const hasActiveSubscription = user.subscriptions?.some(
      s => s.plan !== "free" && s.currentPeriodEnd && s.currentPeriodEnd > new Date()
    )
    if (!hasActiveSubscription) {
      // Anonimizar em vez de deletar para manter integridade referencial
      await db.update(users).set({
        name: "[removido]",
        email: `removed_${user.id}@deleted`,
      }).where(eq(users.id, user.id))
    }
  }
}
```

### Checklist

| # | Item | Status |
|---|---|---|
| 5.1 | Exclusão de conta: `DELETE /api/user` (cascata no schema) | ✅ |
| 5.2 | Export LGPD: `GET /api/user/export` | ✅ |
| 5.3 | Página `/privacidade` pública | ✅ |
| 5.4 | Página `/termos` pública | ✅ |
| 5.5 | Links privacidade/termos no footer (landing) | ✅ |
| 5.6 | Consentimento no cadastro: checkbox + links; registo em `users.lgpd_consent_accepted_at` via `POST /api/user/lgpd-consent` após sign-up (retentativas + recuperação em Configurações → Conta) | ✅ |
| 5.7 | Excluir conta em configurações (`configuracoes-conta-client`) | ✅ |
| 5.8 | Exportar dados em configurações (mesmo componente) | ✅ |
| 5.9 | Privacidade documenta Stripe como processador | ✅ |
| 5.10 | Política de **retenção** descrita na UI (`/privacidade` secção «Retenção de dados») | ✅ |
| 5.11 | **Job/cron** de anonimização: `data-retention-cron.ts` + `/api/cron/data-retention` (opt-in `DATA_RETENTION_CRON_ENABLED`) | ✅ |

---

## Resumo — trabalho restante (abr/2026)

| Seção | Situação |
|---|---|
| 1. RLS | SQL + helpers + `apply-rls.sh` / `verify-rls.sh`; operador aplica no DB em staging → prod quando estiver pronto |
| 2. Logging | Núcleo + credenciais + `onRequestError` + ingest HTTP + script PM2 logrotate; cobertura total de erros 500 ainda opcional |
| 3. Backup | Scripts + crontab + restore + logs em `/var/log/copilote` (executar `install-backup-cron.sh` se APP_DIR ≠ default) |
| 4. Dependências | Dependabot + CI + doc de decisões; preencher `reviewers` no dependabot.yml |
| 5. LGPD | Consentimento + export/exclusão + privacidade + cron retenção (opt-in); alinhar anos inativos ao jurídico |

---

## Instrução final para o Cursor

```
Leia o SECURITY-GAPS.md. Estado atual do código:
- runWithAppUserId + getRequestDb (APIs) e loadForAppUser ((app)/) já implementados.
- RLS manual com 10 tabelas (incl. push e report_downloads).

Priorize:
1) Staging: aplicar docs/postgres/rls-pending-manual.sql, testar app + webhook/cron + push; cross-tenant se necessário
2) Ou outra frente: backup VPS, bumps npm + CI audit (§4.4), ativar `DATA_RETENTION_CRON_ENABLED` após revisão legal, `SECURITY_LOG_INGEST_URL` em prod

Marque checklists conforme for concluindo.
```

Deploy **Easypanel + Docker:** `docs/deploy-easypanel.md` (health `/api/health`, crons com `scripts/run-cron-tasks.sh`).