# Security Audit & Hardening — Copilote SaaS

> **Como usar este documento com o Cursor**
> Coloque este arquivo na raiz do projeto. Para trabalho novo, use **`SECURITY-GAPS.md`** (RLS, logging ampliado, backup, etc.). Este `SECURITY.md` descreve o **baseline de segurança do app** e o estado do checklist no repositório.
>
> _"Leia o SECURITY.md e implemente os itens marcados como ❌ ou ⚠️ um por um, mostrando o código antes e depois de cada alteração."_

---

## Stack de referência

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15.2.4 (App Router) |
| Auth | Better Auth 1.2.7 |
| ORM | Drizzle ORM 0.41.0 |
| Banco | PostgreSQL 17.4 (VPS próprio, localhost) |
| Pagamentos | Stripe 17.7.0 |
| Infra | Ubuntu 24.04 + Nginx + PM2 + Certbot |

---

## Legenda de status

- ✅ Implementado e verificado
- ❌ Ausente ou incorreto — **deve ser corrigido**
- ⚠️ Implementado parcialmente — revisar
- 🔍 Requer inspeção manual antes de classificar

Na **§10** também se usa: **🔓** rota pública de autenticação (Better Auth); **🔐** autenticação por segredo ou assinatura externa (não sessão do app).

> **Revisão do checklist (código no repo — abr/2026):** vários itens foram atualizados de ❌ para ✅ ou ⚠️. Itens 🔍 seguem dependentes de ambiente (`.env`, VPS, inspeção HTTP).

---

## 1. Autenticação e sessão

### O que já existe
- Better Auth configurado em `src/lib/auth.ts` com `emailAndPassword` e sessão de 7 dias
- **Server Components:** `requireSession()` em `src/lib/get-session.ts` (redireciona para `/login` se não autenticado)
- **Route Handlers (`/api/*`):** `requireSession()` em `src/lib/api-session.ts` — sessão via `auth.api.getSession`, resposta **401 JSON** (não redireciona) + rate limit por usuário; exceções: `api/auth/*`, `api/webhooks/stripe`, `api/cron/*`
- `authClient` em `src/lib/auth-client.ts` apontando para `NEXT_PUBLIC_APP_URL`

### Checklist

| # | Item | Status | Arquivo |
|---|---|---|---|
| 1.1 | `BETTER_AUTH_SECRET` com 32+ chars gerado via `openssl rand -base64 32` | 🔍 | `.env.local` |
| 1.2 | `BETTER_AUTH_URL` igual ao domínio de produção (sem trailing slash) | 🔍 | `.env.local` |
| 1.3 | Cookies de sessão com `HttpOnly`, `Secure` e `SameSite=Lax` | 🔍 | Inspecionar resposta HTTP em `/api/auth/sign-in` |
| 1.4 | `requireSession()` no início das route handlers autenticadas em `src/app/api/*` | ✅ | `src/lib/api-session.ts` + rotas em `src/app/api/` (exc. auth, webhook Stripe, cron) |
| 1.5 | Rate limiting ativo nas rotas `/api/auth/*` | ✅ | `src/app/api/auth/[...all]/route.ts` + `src/lib/rate-limiter.ts` |
| 1.6 | Rota de recuperação de senha com rate limiting próprio | ⚠️ | Fluxo via Better Auth em `POST /api/auth/*` coberto pelo item 1.5; página `recuperar-senha` sem limiter extra dedicado |

### Correção obrigatória — 1.4

Todo arquivo **autenticado** em `src/app/api/` deve começar assim (Route Handlers — **401 JSON**, não redirect):

```typescript
// src/app/api/rides/route.ts
import { requireSession } from "@/lib/api-session"

export async function GET(req: Request) {
  const auth = await requireSession()
  if ("response" in auth) return auth.response
  const { userId } = auth
  // ... resto da lógica usando userId
}
```

---

## 2. Multi-tenancy e isolamento de dados (CRÍTICO)

### O que já existe
- Schema com `userId` em todas as tabelas (`rides`, `expenses`, `goals`, `vehicle`, `platformsUsed`, `maintenance`, `subscriptions`)
- Drizzle ORM com queries tipadas

### Checklist

| # | Item | Status | Arquivo |
|---|---|---|---|
| 2.1 | Toda query `SELECT` filtra por `userId` da **sessão** (não do body/params) | ✅ | Rotas em `src/app/api/` auditadas no padrão atual |
| 2.2 | `PATCH` e `DELETE` verificam ownership antes de alterar | ✅ | `src/app/api/rides/[id]/route.ts`, `expenses/[id]`, `maintenance/[id]` |
| 2.3 | IDs das tabelas são UUID ou CUID (não inteiros sequenciais) | 🔍 | `src/db/schema.ts` |
| 2.4 | Nenhuma rota expõe dados sem filtro de usuário | ✅ | Rotas autenticadas revisadas; webhook/cron são casos especiais |
| 2.5 | `userId` nunca vem do `body` ou `params` da requisição | ✅ | Uso de `userId`/`auth.userId` apenas da sessão |

### Padrão obrigatório — ownership check

```typescript
// ✅ CORRETO — sempre assim em PATCH e DELETE
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession()

  const item = await db.query.rides.findFirst({
    where: and(
      eq(rides.id, params.id),
      eq(rides.userId, session.user.id) // ownership obrigatório
    )
  })

  if (!item) {
    return Response.json({ error: "Not found" }, { status: 404 })
    // Retorna 404 (não 403) para não revelar que o item existe
  }

  await db.delete(rides).where(eq(rides.id, params.id))
  return Response.json({ data: null })
}

// ❌ ERRADO — nunca fazer isso
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await db.delete(rides).where(eq(rides.id, params.id)) // deleta de qualquer usuário!
}
```

### Padrão obrigatório — SELECT com filtro

```typescript
// ✅ CORRETO
const userRides = await db.query.rides.findMany({
  where: eq(rides.userId, session.user.id)
})

// ❌ ERRADO — retorna dados de todos os usuários
const allRides = await db.query.rides.findMany()
```

---

## 3. Variáveis de ambiente e segredos

### O que já existe
- `.env.local` com as variáveis definidas no PRD
- `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` no cliente (correto para essas duas)

### Checklist

| # | Item | Status | Verificação |
|---|---|---|---|
| 3.1 | `.env.local` está no `.gitignore` | ✅ | `.gitignore` ignora `.env*` e permite `!.env*.example` — rodar `git ls-files .env*` antes de commit |
| 3.2 | Arquivo de exemplo de env no repo sem segredos | ✅ | `.env.local.example` (chaves documentadas; valores fictícios) |
| 3.3 | `STRIPE_SECRET_KEY` não aparece no código-fonte | 🔍 | `grep -r "sk_live" src/` |
| 3.4 | `DATABASE_URL` não importada em nenhum Client Component | ✅ | Verificado: sem ocorrências em `src/components/` |
| 3.5 | Nenhuma chave secreta prefixada com `NEXT_PUBLIC_` | 🔍 | Apenas publishable key e app URL devem ter esse prefixo |
| 3.6 | No VPS: segredos em variável de ambiente do sistema, não em arquivo `.env` commitado | 🔍 | `/etc/environment` ou PM2 ecosystem config fora do repo |

### Comandos de verificação (rodar localmente)

```bash
# Verificar se algum .env foi para o git
git log --all --full-history -- "**/.env*"
git log --all --full-history -- ".env*"

# Procurar chaves secretas no código
grep -r "sk_live" src/
grep -r "sk_test" src/
grep -r "whsec_" src/

# Verificar o que está exposto como NEXT_PUBLIC_
grep -r "NEXT_PUBLIC_" src/ | grep -v "APP_URL\|STRIPE_PUBLISHABLE"
```

---

## 4. Exposição de dados no frontend

### O que já existe
- Server Components por padrão (conforme regras do projeto)
- Separação entre `(public)`, `(onboarding)` e `(app)` layouts

### Checklist

| # | Item | Status | Arquivo |
|---|---|---|---|
| 4.1 | `userId` não aparece em texto plano no HTML renderizado | 🔍 | Inspecionar elemento nas páginas do `(app)/` |
| 4.2 | `passwordHash` nunca retornado pelas API routes | ✅ | `user/export`: `omitPasswordHash` na resposta; `stripe/create-checkout`: só coluna `email` em `users` |
| 4.3 | Respostas de API com `SELECT` explícito (nunca `SELECT *`) | ⚠️ | Drizzle: preferir colunas explícitas; várias rotas ainda usam `.select()` na tabela inteira |
| 4.4 | Server Components não passam dados sensíveis via props para Client Components | 🔍 | `src/components/layout/sidebar.tsx`, `header.tsx` |
| 4.5 | Source maps desabilitados em produção | ✅ | `next.config.ts` — `productionBrowserSourceMaps: false` |

### Correção obrigatória — 4.5

```typescript
// next.config.ts
const nextConfig = {
  productionBrowserSourceMaps: false, // não expõe código-fonte no navegador
}
```

### Correção obrigatória — 4.2 e 4.3

```typescript
// ✅ CORRETO — sempre selecionar campos explicitamente
const user = await db.query.users.findFirst({
  where: eq(users.id, session.user.id),
  columns: {
    id: true,
    name: true,
    email: true,
    city: true,
    createdAt: true,
    // passwordHash: NÃO incluir
  }
})

// ❌ ERRADO — retorna passwordHash junto
const user = await db.query.users.findFirst({
  where: eq(users.id, session.user.id)
})
```

---

## 5. Validação e injeção

### O que já existe
- Zod instalado e configurado
- TypeScript strict mode ativo
- Drizzle ORM (previne SQL injection por padrão com queries tipadas)

### Checklist

| # | Item | Status | Arquivo |
|---|---|---|---|
| 5.1 | Todo `body` de route handler validado com Zod antes de usar | ✅ | `POST`/`PATCH` com corpo; rotas só com sessão sem body (ex. portal) — N/A |
| 5.2 | Parâmetros de URL (`[id]`) validados antes de usar no banco | ✅ | UUID via `routeUuidParamSchema` em `rides/[id]`, `expenses/[id]`, `maintenance/[id]` + `src/lib/api-query-validators.ts` |
| 5.3 | Nunca usar SQL raw com interpolação de string | ✅ | Verificado no repo (abr/2026): sem concatenar valores em SQL raw |
| 5.4 | Campos `amount`, `distanceKm`, `fuelConsumption` validados como números positivos | ✅ | Schemas Zod em `rides`, `expenses` |

### Padrão obrigatório — validação Zod nas routes

```typescript
import { z } from "zod"

const createRideSchema = z.object({
  platform: z.enum(["uber", "99", "indrive", "particular"]),
  grossAmount: z.number().positive(),
  distanceKm: z.number().positive(),
  startedAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const auth = await requireSession() // `@/lib/api-session` em Route Handlers
  if ("response" in auth) return auth.response

  const body = await req.json()
  const parsed = createRideSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const ride = await db.insert(rides).values({
    ...parsed.data,
    userId: auth.userId, // sempre da sessão, nunca do body
  }).returning()

  return Response.json({ data: ride[0] })
}
```

---

## 6. Stripe e pagamentos

### O que já existe
- `src/lib/stripe.ts` configurado
- Routes em `stripe/create-checkout`, `stripe/create-portal`, `webhooks/stripe`
- `premium-gate.tsx` em `src/components/shared/`

### Checklist

| # | Item | Status | Arquivo |
|---|---|---|---|
| 6.1 | Webhook valida assinatura com `stripe.webhooks.constructEvent` | ✅ | `src/app/api/webhooks/stripe/route.ts` |
| 6.2 | Webhook usa `req.text()` (não `req.json()`) para preservar assinatura | ✅ | `request.text()` antes de `constructEvent` |
| 6.3 | `premium-gate.tsx` verifica plano no **servidor** (não só no cliente) | ✅ | UI recebe `isPremium` do servidor; APIs premium checam `getEffectivePlan` |
| 6.4 | Routes premium consultam `subscriptions` no banco, não apenas prop do componente | ✅ | `getEffectivePlan` → `getUserPlan` em `src/lib/plan-limits.ts` |
| 6.5 | `stripeCustomerId` vinculado ao `userId` correto no webhook | ✅ | `checkout.session.completed` usa `metadata.userId` + `upsertPremiumFromCheckout`; updates usam `resolveUserIdFromSubscription` |

### Correção obrigatória — 6.1 e 6.2

```typescript
// src/app/api/webhooks/stripe/route.ts
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  // CRÍTICO: usar text(), não json() — json() quebra a assinatura
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("Webhook signature invalid:", err)
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Processar apenas eventos conhecidos
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // handler
      break
    default:
      // ignorar eventos desconhecidos silenciosamente
      break
  }

  return Response.json({ received: true })
}
```

### Correção obrigatória — 6.3 (gate no servidor)

```typescript
// Função utilitária para verificar plano — usar nas routes, não só no frontend
// src/lib/subscription.ts
export async function requirePremium(userId: string) {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.plan, "premium"),
      gt(subscriptions.currentPeriodEnd, new Date())
    )
  })

  if (!subscription) {
    return Response.json({ error: "Premium required" }, { status: 403 })
  }

  return null // null = acesso liberado
}

// Uso nas routes premium
export async function GET(req: Request) {
  const session = await requireSession()
  const premiumCheck = await requirePremium(session.user.id)
  if (premiumCheck) return premiumCheck // retorna 403 se não for premium
  // ... lógica da rota
}
```

---

## 7. Rate limiting

### O que já existe
- `src/lib/rate-limiter.ts` existe no projeto

### Checklist

| # | Item | Status | Arquivo |
|---|---|---|---|
| 7.1 | Rate limiter aplicado em `/api/auth/[...all]` | ✅ | `consumeAuthRateLimit` por IP em `POST` |
| 7.2 | Rate limiter nas rotas de export e PDF | ✅ | Mesmo limite geral de API: `requireSession` → `consumeApiRateLimit` por `userId` |
| 7.3 | Limite por IP (não só por usuário) nas rotas públicas | ⚠️ | `POST /api/auth` por IP; páginas GET públicas sem contador dedicado |

### Implementação sugerida

```typescript
// src/lib/rate-limiter.ts — verificar se já tem algo assim, senão criar
import { LRUCache } from "lru-cache" // ou usar upstash/ratelimit se tiver Redis

const cache = new LRUCache<string, number[]>({ max: 500 })

export function rateLimit(identifier: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  const hits = (cache.get(identifier) ?? []).filter(t => now - t < windowMs)
  hits.push(now)
  cache.set(identifier, hits)
  return hits.length <= limit
}

// Uso nas routes
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  if (!rateLimit(`login:${ip}`, 5, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 })
  }
  // ...
}
```

---

## 8. Headers HTTP e Nginx

### Checklist Next.js

| # | Item | Status | Arquivo |
|---|---|---|---|
| 8.1 | `X-Frame-Options` configurado | ⚠️ | `next.config.ts` — `SAMEORIGIN` (não `DENY` do exemplo mínimo) |
| 8.2 | `X-Content-Type-Options: nosniff` | ✅ | `next.config.ts` |
| 8.3 | `Referrer-Policy: strict-origin-when-cross-origin` | ✅ | `next.config.ts` |
| 8.4 | `Content-Security-Policy` básico configurado | ✅ | `next.config.ts` |
| 8.5 | Source maps desabilitados em produção | ✅ | `next.config.ts` |

### Correção — `next.config.ts`

> **Nota:** o projeto real está em `next.config.ts` (CSP, Stripe, Sentry, `SAMEORIGIN`, etc.). O bloco abaixo é **referência mínima**; não copie sem alinhar ao arquivo atual.

```typescript
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
    ].join("; ")
  },
]

const nextConfig = {
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
```

### Checklist Nginx (VPS)

| # | Item | Status | Verificação |
|---|---|---|---|
| 8.6 | `server_tokens off` no `nginx.conf` | ✅ | Exemplo em `nginx/copilote.conf` — confirmar no VPS |
| 8.7 | HSTS habilitado no bloco SSL | ✅ | `nginx/copilote.conf` + Next em produção — confirmar no VPS |
| 8.8 | Porta 5432 fechada externamente | 🔍 | Firewall/host — não é só Nginx |
| 8.9 | TLS 1.2+ apenas (sem TLS 1.0/1.1) | ✅ | `ssl_protocols TLSv1.2 TLSv1.3` em `nginx/copilote.conf` — confirmar no VPS |

### Bloco Nginx recomendado

```nginx
# /etc/nginx/sites-available/copilote
server {
    listen 443 ssl http2;
    server_name seudominio.com.br;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    server_tokens off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name seudominio.com.br;
    return 301 https://$host$request_uri;
}
```

---

## 9. Banco de dados (PostgreSQL no VPS)

### Checklist

| # | Item | Status | Verificação |
|---|---|---|---|
| 9.1 | Usuário do banco (`copilote_user`) sem permissão de superuser | 🔍 | `psql -c "\du"` — deve ter apenas `LOGIN` |
| 9.2 | Permissões mínimas: apenas `SELECT, INSERT, UPDATE, DELETE` nas tabelas do app | 🔍 | `psql -c "\dp"` |
| 9.3 | Backup automático configurado | 🔍 | `crontab -l` — deve ter um `pg_dump` agendado |
| 9.4 | `pg_hba.conf` com autenticação `scram-sha-256` (não `trust` ou `md5`) | 🔍 | `cat /etc/postgresql/17/main/pg_hba.conf` |

---

## 10. Auditoria de rotas — mapa completo

Tabela alinhada aos handlers em `src/app/api/**/route.ts` (abr/2026). **Auth?** = sessão de usuário via `requireSession` (`@/lib/api-session`), exceto onde indicado. **Zod?** = validação de body ou query onde aplicável.

| Rota | Auth? | Ownership? | Zod? | Campos filtrados? |
|---|---|---|---|---|
| `GET /api/rides` | ✅ | — | ✅ (query) | ✅ |
| `POST /api/rides` | ✅ | — | ✅ | ✅ |
| `PATCH /api/rides/[id]` | ✅ | ✅ | ✅ | ✅ |
| `DELETE /api/rides/[id]` | ✅ | ✅ | — (UUID param) | — |
| `GET /api/expenses` | ✅ | — | ✅ (query) | ✅ |
| `POST /api/expenses` | ✅ | — | ✅ | ✅ |
| `PATCH /api/expenses/[id]` | ✅ | ✅ | ✅ | ✅ |
| `DELETE /api/expenses/[id]` | ✅ | ✅ | — (UUID param) | — |
| `GET /api/expenses/max-fuel-odometer` | ✅ | — | ✅ (query) | ✅ |
| `GET /api/goals` | ✅ | — | — | ✅ |
| `POST /api/goals` | ✅ | — | ✅ | ✅ |
| `POST /api/vehicle` | ✅ | — | ✅ | ✅ |
| `PATCH /api/vehicle` | ✅ | ✅ (por `userId`) | ✅ | ✅ |
| `POST /api/platforms` | ✅ | — | ✅ | ✅ |
| `GET /api/maintenance` | ✅ | — | — | ✅ |
| `POST /api/maintenance` | ✅ | — | ✅ | ✅ |
| `PATCH /api/maintenance/[id]` | ✅ | ✅ | ✅ | ✅ |
| `DELETE /api/maintenance/[id]` | ✅ | ✅ | — (UUID param) | — |
| `GET /api/maintenance/badge` | ✅ | — | — | ✅ |
| `GET /api/reports/summary` | ✅ (premium) | — | ✅ (query) | ✅ |
| `GET /api/reports/pdf` | ✅ (premium) | — | ✅ (query) | ✅ |
| `GET /api/rides/export` | ✅ (premium) | — | ✅ (query) | ✅ |
| `GET /api/expenses/export` | ✅ (premium) | — | ✅ (query) | ✅ |
| `GET /api/user/export` | ✅ | — | — | ✅ |
| `DELETE /api/user` | ✅ | ✅ (próprio usuário) | — | — |
| `PATCH /api/user/profile` | ✅ | ✅ (próprio usuário) | ✅ | ✅ |
| `POST /api/stripe/create-checkout` | ✅ | — | ✅ | — |
| `POST /api/stripe/create-portal` | ✅ | — | — (sem body) | — |
| `POST /api/stripe/cancel-subscription` | ✅ | — | — (sem body) | — |
| `GET /api/push/vapid-public-key` | ✅ | — | — | — |
| `GET /api/push/status` | ✅ | — | — | ✅ |
| `POST /api/push/subscribe` | ✅ | — | ✅ | ✅ |
| `POST /api/push/unsubscribe` | ✅ | — | ✅ | ✅ |
| `POST /api/push/test` | ✅ | — | — | — |
| `GET/POST /api/auth/[...all]` | 🔓 Better Auth | — | — | — |
| `GET/POST /api/cron/maintenance-push` | 🔐 `CRON_SECRET` | — | — | — |
| `POST /api/webhooks/stripe` | 🔐 assinatura Stripe | — | — | — |
| `GET /api/sentry-example-api` | ✅ (dev; 404 em prod) | — | — | — |

> **Manutenção:** ao adicionar `src/app/api/.../route.ts`, inclua a linha nesta tabela e revise os checklists das seções 1–8.

---

## 11. Checklist de deploy seguro

Antes de cada deploy em produção, verificar:

```bash
# 1. Nenhum segredo commitado
git log --all --full-history -- "**/.env*"

# 2. Build sem erros de TypeScript
npx tsc --noEmit

# 2b. Vulnerabilidades npm (nível high+)
npm audit --audit-level=high

# 3. Porta do banco fechada
nmap -p 5432 seudominio.com.br

# 4. Headers de segurança ativos
curl -I https://seudominio.com.br | grep -E "X-Frame|X-Content|Strict-Transport|CSP"

# 5. Variáveis de ambiente de produção no PM2
pm2 env 0
```

---

## 12. Prioridade de implementação

Implementar nesta ordem — os primeiros são os mais críticos:

1. **Sessão em todas as routes** (seção 1.4) — sem isso, qualquer rota é pública
2. **Ownership check em PATCH/DELETE** (seção 2.2) — sem isso, qualquer usuário edita dados de outro
3. **Filtro userId em todos os SELECTs** (seção 2.1) — sem isso, dados de todos os usuários são visíveis
4. **Validação do webhook Stripe** (seção 6.1) — sem isso, pagamentos podem ser simulados
5. **Gate premium no servidor** (seção 6.3) — sem isso, o frontend pode ser bypassado
6. **Validação Zod nas routes** (seção 5.1) — sem isso, dados inválidos chegam ao banco
7. **Headers de segurança** (seção 8) — importante, mas não expõe dados de usuário diretamente
8. **Rate limiting** (seção 7) — importante para produção com usuários reais
9. **Source maps desabilitados** (seção 4.5) — boa prática para produção
10. **Configuração Nginx** (seção 8.6-8.9) — hardening do servidor

**Estado abr/2026:** itens 1–10 atendidos no código do repositório conforme checklists acima (ver notas ⚠️/🔍). Próxima camada sugerida: `SECURITY-GAPS.md` (ex.: RLS no Postgres, logging estruturado estendido).

**Produção (vetores diretos):** autenticação nas APIs, isolamento por `userId` no código, validação (Zod), Stripe e headers estão alinhados ao baseline de segurança. **Evolução planejada em três frentes:** (1) contexto Postgres `app.current_user_id` — **`runWithAppUserId` + `getRequestDb()`** nas APIs e **`loadForAppUser`** em `src/app/(app)/` (mesmo modelo); em seguida **ativar** o SQL de RLS no Postgres (staging → produção); (2) resolver CVEs de dependências e endurecer o workflow de `npm audit` no CI; (3) itens LGPD e operacionais no VPS conforme prioridade do produto — ver `SECURITY-GAPS.md`.

---

## 13. Conclusão (auditoria do repositório)

| Seção | Resumo |
|---|---|
| **1** | Sessão obrigatória nas APIs autenticadas (`api-session`); auth/cron/webhook com modelos próprios; rate limit em `POST /api/auth`. |
| **2** | Isolamento por `userId` da sessão; ownership em `PATCH`/`DELETE` com `[id]`; UUID validado em Zod onde aplicável. |
| **3–4** | Segredos fora do cliente (exc. `NEXT_PUBLIC_*` permitidos); `passwordHash` não exposto nas APIs mapeadas; source maps off em prod. |
| **5–6** | Zod em bodies/queries críticos; Stripe webhook com `text()` + `constructEvent`; premium checado no servidor (`getEffectivePlan`). |
| **7–8** | Rate limit por IP (auth) e por usuário (API); headers de segurança e CSP no Next; template Nginx em `nginx/copilote.conf`. |
| **9–11** | Itens **9.x** e deploy: verificação **no VPS** (Postgres, firewall, PM2). |
| **12** | Prioridades de implementação do app: **concluídas no código**; restando melhorias operacionais (🔍) e endurecimento extra em **`SECURITY-GAPS.md`**. |
| **RLS** | APIs: **`runWithAppUserId`**; páginas autenticadas **`src/app/(app)/`**: **`loadForAppUser`** (`src/lib/load-for-app-user.ts`); libs: **`getRequestDb()`**. Cross-tenant: pool global (`SECURITY-GAPS.md` §1). |

**Próximo passo (escolha uma frente):** **A)** Staging — backup → `psql … -f docs/postgres/rls-pending-manual.sql` → testar `(app)/`, APIs, webhook Stripe, cron e fluxo cross-tenant → repetir em produção se estável; **B)** se RLS não for agora — `SECURITY-GAPS.md` §§3–5 (backup/restore VPS, CVEs/`npm audit`, LGPD).