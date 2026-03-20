# Tasks do Cursor — Piloto SaaS
**Desenvolvimento página por página, integrado e incremental**

> **Como usar:** Cole cada task no Cursor como um prompt separado. Execute em ordem. Cada task é autocontida mas referencia o código já criado nas anteriores.

---

## FASE 0 — Setup do Projeto

---

### TASK 0.1 — Inicializar o projeto Next.js

```
Crie um projeto Next.js 15.2.4 com as seguintes configurações:

- TypeScript strict mode ativado
- Tailwind CSS 4
- App Router (não Pages Router)
- src/ directory
- Import alias @/*
- ESLint configurado

Após criar, instale estas dependências exatas:
npm install better-auth@1.2.7 drizzle-orm@0.41.0 pg@8.13.3 zod@3.24.2 react-hook-form@7.55.0 @hookform/resolvers@3.10.0 lucide-react@0.487.0 recharts@2.15.1 date-fns@4.1.0 clsx@2.1.1 tailwind-merge@3.2.0 sonner@2.0.3 stripe@17.7.0 @react-pdf/renderer@4.3.0

npm install -D drizzle-kit@0.30.0 @types/pg

Configure o shadcn/ui:
npx shadcn@2.5.0 init
Escolha: New York style, cor base zinc, CSS variables sim

Instale os componentes shadcn necessários:
npx shadcn add button input label card badge dialog drawer sheet select checkbox switch progress separator skeleton table tabs avatar dropdown-menu
```

---

### TASK 0.2 — Configurar Tailwind e tema visual Uber

```
Configure o design system inspirado na Uber no arquivo src/app/globals.css.

O tema deve usar:
- Fundo: #FFFFFF (branco puro)
- Primário: #000000 (preto)
- Muted: #F6F6F6 (cinza claro para fundos de página)
- Border: #EEEEEE (cinza muito claro)
- Sucesso: #00A651 (verde)
- Perigo: #E53935 (vermelho)
- Tipografia: Inter (carregar via next/font/google)
- Radius padrão: 8px

Em src/app/layout.tsx:
- Adicione a fonte Inter via next/font/google
- Configure o Toaster do Sonner
- Adicione meta tags básicas (title, description)

Crie o arquivo src/lib/utils.ts com a função cn() usando clsx + tailwind-merge.
```

---

### TASK 0.3 — Configurar banco de dados Postgres + Drizzle ORM

```
Configure a conexão com PostgreSQL e o schema completo do Drizzle ORM.

Crie o arquivo drizzle.config.ts na raiz:
- schema: "./src/db/schema.ts"
- out: "./src/db/migrations"
- dialect: "postgresql"
- usa DATABASE_URL do .env

Crie src/db/schema.ts com as seguintes tabelas (use drizzle-orm/pg-core):

1. users: id (uuid pk), name, email (único), passwordHash, city, createdAt, updatedAt
2. sessions: id, userId (fk users), token, expiresAt, createdAt (tabela para Better Auth)
3. vehicles: id, userId (fk cascade), model, year, fuelConsumption (decimal 5,2), fuelPrice (decimal 6,2), depreciationPerKm (decimal 5,3 default 0.10), currentOdometer (int default 0)
4. platforms_used: id, userId (fk cascade), platform (enum: uber, 99, indrive, particular)
5. rides: id, userId (fk cascade), platform (enum), grossAmount (decimal 8,2), distanceKm (decimal 7,2), startedAt (timestamp), durationMinutes (int nullable), notes (text nullable), createdAt
6. expenses: id, userId (fk cascade), category (enum: fuel, maintenance, insurance, fine, other), amount (decimal 8,2), odometer (int nullable), liters (decimal 6,2 nullable), description (text nullable), occurredAt, createdAt
7. goals: id, userId (fk cascade), monthlyTarget (decimal 8,2), month (int), year (int), achieved (bool default false)
8. maintenanceItems: id, userId (fk cascade), type (varchar 100), lastServiceKm (int), lastServiceAt (timestamp), intervalKm (int), estimatedCost (decimal 7,2 nullable)
9. subscriptions: id, userId (fk cascade único), plan (varchar default 'free'), stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, cancelAtPeriodEnd (bool default false), createdAt

Crie src/db/index.ts com a conexão usando Pool do pg e o drizzle() client.

Crie o arquivo .env.local.example com todas as variáveis necessárias documentadas.

Execute: npx drizzle-kit generate para criar a primeira migration.
```

---

### TASK 0.4 — Configurar Better Auth

```
Configure o sistema de autenticação com Better Auth 1.2.7.

Crie src/lib/auth.ts:
- Use betterAuth() com drizzleAdapter apontando para o db
- emailAndPassword: enabled true, requireEmailVerification: false (MVP)
- session: expiresIn 7 dias, updateAge 1 dia
- rateLimit: window 15 minutos, max 5 tentativas

Crie src/lib/auth-client.ts:
- Use createAuthClient() do better-auth/react
- baseURL do BETTER_AUTH_URL do env

Crie a route handler em src/app/api/auth/[...all]/route.ts:
- Exporte toNextJsHandler(auth.handler) como GET e POST

Crie o helper src/lib/get-session.ts:
- Função getSession() que usa auth.api.getSession() para uso em Server Components
- Função requireSession() que redireciona para /login se não houver sessão

Crie o middleware src/middleware.ts:
- Protege todas as rotas /(app)/* — redireciona para /login se não autenticado
- Protege rotas /(onboarding)/* — redireciona para /login se não autenticado
- Redireciona /login e /cadastro para /dashboard se já autenticado
```

---

### TASK 0.5 — Criar estrutura de pastas e layouts

```
Crie a estrutura completa de route groups do Next.js App Router:

src/app/
├── (public)/           ← landing, auth
│   ├── layout.tsx      ← layout simples, sem sidebar
│   ├── page.tsx        ← landing page (placeholder por enquanto)
│   ├── login/page.tsx
│   ├── cadastro/page.tsx
│   └── recuperar-senha/page.tsx
├── (onboarding)/
│   ├── layout.tsx      ← layout minimalista com progress indicator
│   └── onboarding/
│       ├── veiculo/page.tsx
│       ├── plataformas/page.tsx
│       └── meta/page.tsx
├── (app)/              ← área autenticada
│   ├── layout.tsx      ← layout com sidebar + header
│   ├── dashboard/page.tsx
│   ├── corridas/page.tsx
│   ├── gastos/page.tsx
│   ├── inteligencia/page.tsx
│   ├── manutencao/page.tsx
│   ├── metas/page.tsx
│   ├── relatorios/page.tsx
│   ├── planos/page.tsx
│   └── configuracoes/
│       ├── perfil/page.tsx
│       ├── veiculo/page.tsx
│       ├── plano/page.tsx
│       └── conta/page.tsx
└── api/
    ├── auth/[...all]/route.ts (já criado)
    ├── rides/route.ts
    ├── expenses/route.ts
    ├── goals/route.ts
    ├── maintenance/route.ts
    ├── vehicle/route.ts
    ├── reports/pdf/route.ts
    └── webhooks/stripe/route.ts

Em cada page.tsx coloque apenas um placeholder: o título da página em h1.

Crie o layout da área autenticada (app)/layout.tsx com:
- Sidebar fixa à esquerda (240px, fundo preto) no desktop
- Bottom navigation no mobile (5 ícones)
- Área de conteúdo à direita com fundo #F6F6F6
```

---

## FASE 1 — Autenticação e Onboarding

---

### TASK 1.1 — Componente Sidebar e Bottom Navigation

```
Crie os componentes de navegação do app autenticado.

Crie src/components/layout/sidebar.tsx:
- Fundo preto (#000000), largura 240px, altura 100vh, fixa
- Logo "Piloto" no topo em branco, bold, 20px
- Navegação com os itens:
  Dashboard (/dashboard) → ícone LayoutDashboard
  Corridas (/corridas) → ícone Car
  Gastos (/gastos) → ícone Receipt
  Inteligência (/inteligencia) → ícone TrendingUp
  Manutenção (/manutencao) → ícone Wrench
  Metas (/metas) → ícone Target
  Relatórios (/relatorios) → ícone FileText
  --- separador ---
  Configurações (/configuracoes/perfil) → ícone Settings
- Cada item: texto branco, padding 12px 16px, radius 8px
- Estado ativo (usePathname): fundo #1a1a1a + borda esquerda 2px branca
- Hover: fundo #111111
- Rodapé da sidebar: avatar (círculo com inicial do nome, fundo branco, texto preto) + nome do usuário + badge do plano (FREE/PRO)

Crie src/components/layout/mobile-nav.tsx:
- Bottom bar fixo no mobile (hidden no desktop: md:hidden)
- 5 ícones: Dashboard, Corridas, Gastos, Metas, Menu (abre Sheet)
- Fundo branco, border-top 1px #EEEEEE
- Ícone ativo: preto + label bold; inativo: #888888
- O botão Menu abre um Sheet lateral com a navegação completa

Use o hook useSession do better-auth/react para obter o nome do usuário.
```

---

### TASK 1.2 — Tela de Cadastro

```
Crie a página de cadastro em src/app/(public)/cadastro/page.tsx.

Layout split-screen:
- Lado esquerdo (hidden em mobile, lg:flex): fundo preto, 50% da largura
  - Logo "Piloto" em branco centralizado
  - Tagline: "Controle financeiro para quem dirige o próprio negócio"
  - 3 bullet points com ícones check brancos: "Calcule seu lucro real", "Veja qual turno compensa mais", "Grátis para começar"
- Lado direito: fundo branco, 50% da largura (100% no mobile)
  - Formulário centralizado, max-width 400px, padding 48px 40px

Formulário com React Hook Form + Zod:
Schema Zod:
  - name: string min 2 max 100
  - email: email válido
  - password: min 8, deve ter letras e números
  - confirmPassword: deve ser igual a password (refine)

Campos:
  - Nome completo (label + input)
  - Email (label + input type email)
  - Senha (label + input type password + toggle mostrar/ocultar com ícone Eye/EyeOff)
  - Confirmar senha (label + input type password + toggle)

Indicador de força da senha abaixo do campo (4 requisitos com check verde/círculo cinza):
  - ✓ Mínimo 8 caracteres
  - ✓ Pelo menos uma letra maiúscula
  - ✓ Pelo menos um número
  - ✓ Senhas iguais

Botão "Criar conta" — preto, full width, rounded-lg
Link "Já tenho conta → Entrar" centralizado abaixo

Ao submeter: chamar authClient.signUp.email() do better-auth/react
- Loading: disabled + spinner no botão
- Sucesso: redirecionar para /onboarding/veiculo
- Erro: toast vermelho com a mensagem de erro
```

---

### TASK 1.3 — Tela de Login

```
Crie a página de login em src/app/(public)/login/page.tsx.

Mesmo split-screen do cadastro.
Lado esquerdo: fundo preto com logo e frase "Bem-vindo de volta"
Lado direito: formulário de login

Schema Zod: email + password (min 8)

Campos:
- Email
- Senha com toggle ver/ocultar
- Link "Esqueci minha senha" alinhado à direita

Botão "Entrar" — preto full width
Link "Não tem conta? Cadastre-se grátis"

Ao submeter: chamar authClient.signIn.email() do better-auth/react
- Loading: spinner
- Sucesso: redirecionar para /dashboard
- Erro: toast "Email ou senha incorretos" (nunca especificar qual campo)
- Erro de rate limit: mensagem "Muitas tentativas. Aguarde 15 minutos."
```

---

### TASK 1.4 — Recuperação de Senha

```
Crie a tela de recuperação de senha em src/app/(public)/recuperar-senha/page.tsx.

Gerencie o estado da tela com useState: 'request' | 'sent' | 'new-password'

Estado 'request':
- Formulário com campo email
- Botão "Enviar link de recuperação"
- Link "Voltar para o login"
- Ao enviar: chamar Better Auth email reset, mudar estado para 'sent'

Estado 'sent':
- Ícone de envelope (Lucide: Mail, 48px)
- "Verifique seu email"
- "Enviamos para [email]. O link expira em 1 hora."
- Botão "Reenviar" com countdown de 60 segundos (desabilitado enquanto conta)

Estado 'new-password' (detectado via ?token= na URL):
- Campos: nova senha + confirmar
- Botão "Salvar nova senha"
- Ao salvar: chamar Better Auth resetPassword com o token
- Sucesso: toast + redirecionar para /login
```

---

### TASK 1.5 — Onboarding: Passo 1 — Veículo

```
Crie a tela em src/app/(onboarding)/onboarding/veiculo/page.tsx.

Layout: fundo branco, conteúdo centralizado max-width 520px, padding 48px 24px.

Crie o componente de progress steps em src/components/onboarding/progress-steps.tsx:
- 3 steps com dots: preenchido (preto), vazio (borda cinza)
- Label do step atual: "Passo X de 3 — [nome]"

Schema Zod para o veículo:
- model: string obrigatório
- year: number entre 1990 e 2026
- fuelConsumption: number entre 3 e 30 (km/l)
- fuelPrice: number entre 3 e 15 (R$/l)
- currentOdometer: number opcional min 0

Campos do formulário:
- Modelo: text input (placeholder: "Ex: Toyota Corolla 2020")
- Ano: number input
- Consumo médio: input com sufixo "km/l"
- Preço do combustível: input com prefixo "R$" e sufixo "/litro"
- Km atual (opcional): input com sufixo "km"

Preview em tempo real (atualiza com watch do React Hook Form):
Card cinza claro mostrando:
"Com esses dados, seu custo estimado é de R$ X,XX por km"
Cálculo: fuelPrice / fuelConsumption

Botão "Próximo →" — preto full width

Ao submeter:
- POST /api/vehicle com os dados
- Redirecionar para /onboarding/plataformas

Crie a API route POST /api/vehicle:
- Verificar sessão (requireSession)
- Validar body com Zod
- Fazer upsert na tabela vehicles com o userId da sessão
- Retornar { data: vehicle, error: null }
```

---

### TASK 1.6 — Onboarding: Passo 2 — Plataformas

```
Crie src/app/(onboarding)/onboarding/plataformas/page.tsx.

Step 2 ativo no progress indicator.

Seleção visual de plataformas — não use checkboxes tradicionais:
Crie 4 cards clicáveis lado a lado (2x2 no mobile, 4 colunas no desktop):
- Card Uber: fundo branco, borda 1px cinza. Ativo: borda 2px preta, fundo #FAFAFA
- Card 99: mesma lógica
- Card inDrive: mesma lógica
- Card Particular: ícone Car + "Corridas particulares"

Cada card: 80x80px mínimo, ícone (SVG simples ou texto estilizado) + label abaixo
Múltipla seleção com useState<string[]>

Validação: pelo menos 1 plataforma selecionada

Botões: "← Voltar" (ghost/outline) + "Próximo →" (preto)

Ao clicar em Próximo:
- POST /api/platforms com array de plataformas
- Redirecionar para /onboarding/meta

Crie a API route POST /api/platforms:
- Verificar sessão
- Deletar plataformas existentes do usuário
- Inserir as novas em platforms_used
```

---

### TASK 1.7 — Onboarding: Passo 3 — Meta

```
Crie src/app/(onboarding)/onboarding/meta/page.tsx.

Step 3 ativo.

Input grande centralizado:
- Label "Quanto você quer lucrar por mês?"
- Input com prefixo "R$" grande (font-size 32px, bold)
- Placeholder: 3000
- Slider abaixo sincronizado: min 500, max 10000, step 100

Preview calculado em tempo real:
Card com 2 linhas:
- "Meta diária: R$ X,XX" (valor ÷ 22)
- "Meta por corrida: R$ X,XX" (valor ÷ 22 ÷ 8)
Atualiza instantaneamente com onChange do input e slider

Botão "Começar a usar o Piloto →" — preto full width

Ao submeter:
- POST /api/goals com monthlyTarget, month atual, year atual
- Redirecionar para /dashboard com ?onboarding=complete
- No dashboard, detectar o query param e mostrar toast "Tudo configurado! Bem-vindo ao Piloto 🚗"

Crie API route POST /api/goals:
- Verificar sessão
- Upsert na tabela goals para o mês/ano atual do usuário
```

---

## FASE 2 — Dashboard e Registro

---

### TASK 2.1 — API de Cálculos Financeiros

```
Crie o módulo de cálculos em src/lib/calculations.ts com as seguintes funções puras (sem side effects, todas tipadas com TypeScript):

1. calculateRideCost(distanceKm: number, vehicle: Vehicle): number
   → (distanceKm / vehicle.fuelConsumption) × vehicle.fuelPrice + (distanceKm × vehicle.depreciationPerKm)

2. calculateRideProfit(grossAmount: number, rideCost: number): number
   → grossAmount - rideCost

3. calculateCostPerKm(expenses: Expense[], rides: Ride[]): number
   → totalFuelExpenses / totalKmRidden

4. calculateEfficiencyScore(rides: Ride[], expenses: Expense[], vehicle: Vehicle): ScoreByShift
   → agrupa por turno (Madrugada/Manhã/Tarde/Noite baseado no startedAt)
   → para cada turno: soma lucro líquido ÷ horas trabalhadas
   → retorna objeto { morning: number, afternoon: number, evening: number, night: number }

5. calculateMonthlyGoalProgress(goal: Goal, rides: Ride[], expenses: Expense[], vehicle: Vehicle): GoalProgress
   → totalEarned: soma dos lucros líquidos do mês
   → percentage: (totalEarned / goal.monthlyTarget) × 100
   → projectedCompletion: data estimada para atingir a meta no ritmo atual
   → dailyAverage: média diária de lucro

6. groupRidesByPlatform(rides: Ride[], expenses: Expense[], vehicle: Vehicle): PlatformSummary[]
   → para cada plataforma: total bruto, total corridas, lucro líquido, lucro por hora

Exporte todos os tipos necessários para TypeScript.
Escreva JSDoc em cada função.
```

---

### TASK 2.2 — APIs de Corridas e Gastos

```
Crie as API routes para corridas e gastos.

src/app/api/rides/route.ts:

GET /api/rides:
- Verificar sessão
- Aceitar query params: startDate, endDate, platform, page (default 1), limit (default 20)
- Buscar rides do userId com drizzle where + between para datas
- Retornar { data: { rides, total, page, totalPages }, error: null }

POST /api/rides:
- Verificar sessão
- Schema Zod: platform (enum), grossAmount (positivo), distanceKm (positivo), startedAt, durationMinutes (opcional), notes (opcional)
- Verificar limite de 50 corridas/mês para plano free (buscar count do mês + buscar plano)
- Se limite atingido: retornar 403 com error.code "LIMIT_REACHED"
- Inserir na tabela rides
- Retornar a ride criada com o lucro calculado (usando calculations.ts)

PATCH /api/rides/[id]/route.ts:
- Verificar que a ride pertence ao usuário logado
- Validar body parcial com Zod
- Update no banco

DELETE /api/rides/[id]/route.ts:
- Verificar ownership
- Soft delete (adicione deletedAt) ou hard delete — use hard delete no MVP

src/app/api/expenses/route.ts — mesma estrutura:
GET com filtros de data e categoria
POST com schema: category, amount, odometer (obrigatório se category=fuel), liters (opcional se fuel), description, occurredAt
PATCH e DELETE em /api/expenses/[id]/route.ts
```

---

### TASK 2.3 — Dashboard Principal

```
Crie a tela do Dashboard em src/app/(app)/dashboard/page.tsx como Server Component.

O dashboard deve buscar dados do servidor diretamente (sem useEffect no cliente — use async/await no Server Component).

Crie src/components/dashboard/dashboard-client.tsx como Client Component para interatividade (seletor de período).

Estrutura da página:

1. Header da página:
   "Olá, [nome]!" + data atual
   Botão "+ Registrar corrida" (abre o drawer de registro)

2. Seletor de período (Client Component):
   Botões: Hoje | Esta semana | Este mês | Personalizado
   Ao mudar: atualiza os dados via router.push com query params de data

3. Cards de resumo (grid 2x2 mobile, 4 desktop):
   Buscar: soma gross_amount das rides no período, soma de expenses, calcular lucro líquido
   - Faturamento Bruto: R$ X.XXX,XX — seta verde se > período anterior
   - Total Gastos: R$ X.XXX,XX
   - Lucro Líquido: R$ X.XXX,XX (texto maior, bold)
   - Custo/Km: R$ X,XX/km

4. Progress bar da meta:
   Buscar goal do mês atual, calcular progresso com calculateMonthlyGoalProgress()
   Barra preta sobre cinza, texto "R$ X de R$ Y — Z%"
   Se não tem meta: card com CTA "Definir meta →"

5. Gráfico de lucro diário (Client Component):
   LineChart do Recharts com dados dos últimos N dias do período
   Linha preta, área preenchida cinza claro
   Tooltip com data + valor

6. Gráfico de gastos por categoria:
   BarChart horizontal, barras pretas
   Dados: agrupar expenses do período por category

7. Tabela das últimas 5 corridas:
   Plataforma (badge) | Valor bruto | Lucro líquido | Data/hora
   Link "Ver todas corridas →"

Crie src/components/dashboard/stat-card.tsx como componente reutilizável.
```

---

### TASK 2.4 — Drawer de Registro de Corrida

```
Crie o componente de registro de corrida em src/components/rides/ride-form-drawer.tsx.

Use o componente Drawer do shadcn para mobile e Dialog para desktop:
- Detectar via useMediaQuery('(max-width: 768px)')

Conteúdo do formulário:

1. Seleção de plataforma (4 botões visuais em grid 2x2):
   Uber | 99 | inDrive | Particular
   Selecionado: fundo preto, texto branco; não selecionado: borda cinza

2. Input "Valor recebido":
   Prefixo "R$" fixo, inputMode="decimal"
   Label: "Valor bruto da corrida"

3. Input "Km rodados":
   Sufixo "km", inputMode="decimal"

4. Input "Data e hora":
   type="datetime-local", valor padrão: agora

5. Input "Duração" (opcional):
   Sufixo "min", inputMode="numeric"

6. Textarea "Observação" (opcional)

7. Preview em tempo real (atualiza com watch):
   Card cinza com 3 linhas:
   "Custo estimado: R$ X,XX"
   "Lucro líquido: R$ X,XX"  ← verde se positivo
   "Lucro por km: R$ X,XX"
   Usar calculateRideCost() com os dados do veículo do usuário (passar via props ou context)

8. Botões: "Cancelar" (ghost) + "Salvar corrida" (preto, full width)

Ao submeter:
- POST /api/rides
- Se 403 LIMIT_REACHED: fechar drawer + abrir modal de upgrade
- Se sucesso: fechar drawer + toast "Corrida salva! Lucro: R$ X,XX" + invalidar cache do dashboard

Este componente deve ser reutilizável para edição (recebe ride? como prop opcional).
```

---

### TASK 2.5 — Lista de Corridas

```
Crie src/app/(app)/corridas/page.tsx.

Header: "Corridas" + botão "+ Nova corrida" (abre o RideFormDrawer)

Filtros (Client Component em src/components/rides/rides-filters.tsx):
- Date range picker (dois inputs date ou componente calendário shadcn)
- Select de plataforma: Todas | Uber | 99 | inDrive | Particular
- Select ordenar: Mais recentes | Mais antigas | Maior valor | Menor valor
- Botão "Limpar" (visível quando algum filtro ativo)
- Ao mudar: atualizar URL query params

Cards de resumo rápido (3 cards):
- Total de corridas no período
- Faturamento bruto total
- Lucro líquido total

Tabela de corridas:
Colunas: Data/Hora | Plataforma | Valor Bruto | Km | Custo Comb. | Lucro Líq. | Ações

Badge de plataforma com cores:
- Uber: fundo preto, texto branco
- 99: fundo amarelo #F7C948, texto preto
- inDrive: fundo verde #2B9C34, texto branco
- Particular: fundo cinza, texto preto

Ações: ícone lápis (edit, abre drawer com dados pré-preenchidos) + ícone lixeira (delete, abre AlertDialog de confirmação)

Paginação: 20 por página. Botões ← Anterior | Próxima →. "Mostrando X–Y de Z corridas"

Estado vazio: 
ícone Car (64px, cinza) + "Nenhuma corrida registrada" + "Registre sua primeira corrida para começar a acompanhar seu lucro" + botão "+ Registrar corrida"

Banner de limite (freemium):
Se o usuário atingiu 50 corridas no mês atual:
Banner amarelo no topo: "Você atingiu o limite de 50 corridas do plano gratuito neste mês. Faça upgrade para registrar corridas ilimitadas." + botão "Ver planos"
```

---

### TASK 2.6 — Drawer e Lista de Gastos

```
Crie o formulário de gastos em src/components/expenses/expense-form-drawer.tsx.

Seleção de categoria com cards visuais (ícones Lucide):
- Combustível → ícone Fuel (laranja)
- Manutenção → ícone Wrench (azul)
- Seguro → ícone Shield (roxo)
- Multa → ícone AlertTriangle (vermelho)
- Outros → ícone MoreHorizontal (cinza)

Campos base: valor (R$), data, descrição (opcional)

Campos condicionais (aparecem apenas se categoria = Combustível):
- Litros abastecidos
- Km do odômetro atual
- Preview: "Custo por litro: R$ X,XX | Custo por km atualizado: R$ X,XX"

Crie src/app/(app)/gastos/page.tsx com:
- Mesma estrutura da lista de corridas
- Filtros: período + categoria
- Cards: total gasto, maior categoria, custo/km atual
- Tabela: Data | Categoria (badge colorido) | Descrição | Valor | Ações
- Estado vazio com CTA
```

---

## FASE 3 — Inteligência e Manutenção

---

### TASK 3.1 — Tela de Inteligência (Score + Heatmap)

```
Crie src/app/(app)/inteligencia/page.tsx.

Verificar no servidor se o usuário tem plano premium:
- Se free: mostrar paywall (conteúdo desfocado + banner de upgrade)

Componente de paywall src/components/shared/premium-gate.tsx:
- Props: children, feature (nome da feature bloqueada)
- Se free: renderiza banner preto "Esta feature é exclusiva do plano Premium" + botão "Desbloquear por R$19,90/mês" + children com filter: blur(4px) pointer-events: none
- Se premium: renderiza children normalmente

Conteúdo da tela (Premium):

1. Score por turno — 4 cards em grid:
   Buscar rides dos últimos 30 dias
   Usar calculateEfficiencyScore() para obter lucro/hora por turno
   Card: nome do turno + horário + "R$ X,XX/hora" grande
   Badge "Melhor turno" no mais alto (fundo preto, texto branco)
   Badge "Mais fraco" no mais baixo (fundo cinza, texto preto)

2. Heatmap Dias × Turnos:
   Grid 7 colunas (Seg–Dom) × 4 linhas (turnos)
   Cada célula: cor de fundo baseada na intensidade do lucro
   Escala: #F6F6F6 (sem dados) → #CCCCCC → #888888 → #333333 → #000000
   Valor do lucro médio/hora no centro da célula
   Legenda horizontal abaixo

3. Comparativo por plataforma:
   Tabela: Plataforma | Corridas | Faturamento | Lucro Líq. | Lucro/Hora
   Row em bold para a plataforma mais rentável por hora
   Usar groupRidesByPlatform() do calculations.ts

4. Evolução do custo/km:
   LineChart mostrando o custo/km de cada mês nos últimos 6 meses
   Linha preta, pontos nos meses
   Se custo subiu vs mês anterior: texto vermelho; se caiu: verde
```

---

### TASK 3.2 — Tela de Manutenção

```
Crie src/app/(app)/manutencao/page.tsx.

API routes necessárias:
GET /api/maintenance — listar itens do usuário
POST /api/maintenance — criar item
PATCH /api/maintenance/[id] — atualizar (registrar serviço = atualizar lastServiceKm e lastServiceAt)
DELETE /api/maintenance/[id] — remover

Lógica de alerta:
Para cada item, calcular:
- kmSinceLastService = currentOdometer - lastServiceKm
- percentageDue = kmSinceLastService / intervalKm
- status: "ok" (< 80%), "warning" (80–99%), "overdue" (≥ 100%)

Seção de alertas (apenas se houver itens com status warning ou overdue):
Banner colorido no topo:
- overdue: fundo vermelho claro, "X manutenções atrasadas"
- warning: fundo amarelo claro, "X manutenções próximas"
Cards de alerta: ícone + nome + "Faltam X km" + barra de progresso

Items cadastrados (lista de cards):
Cada card: tipo | "Último serviço: X km em DD/MM/AAAA" | "Próximo: Y km" | custo estimado | badge de status | botão "Registrar serviço" (abre modal com km atual e data)

Botão "+ Adicionar manutenção" (abre drawer):
Campos: tipo (select com opções pré-definidas: Troca de Óleo, Pneus, Freios, Revisão, Filtro de Ar, Outros + campo custom), último serviço km, data do serviço, intervalo em km, custo estimado (R$)

Provisão sugerida:
Card: "Reserve R$ X,XX por km rodado para manutenções futuras"
Cálculo: soma dos (custoEstimado / intervalKm) de todos os itens
```

---

### TASK 3.3 — Tela de Metas

```
Crie src/app/(app)/metas/page.tsx.

Buscar no servidor: goal do mês atual + rides + expenses do mês

Card principal da meta:
- Se não tem meta: card com CTA "Definir minha meta mensal →"
- Se tem meta: card grande com
  - Título: "Meta de [Mês Atual]"
  - Valor da meta em destaque: "R$ X.XXX"
  - Barra de progresso larga (height 12px, cor preta)
  - "R$ X.XXX de R$ X.XXX — XX%"
  - Se atingida: badge verde "Meta atingida! 🎉"
  - Se projetada para bater: "Você vai atingir sua meta em X dias"
  - Se projetada para não bater: "No ritmo atual, você ficará R$ X abaixo da meta"
  - Botão "Ajustar meta" (ghost, abre modal de edição)

Sub-cards (3 em linha):
- Meta diária: R$ X,XX
- Meta semanal: R$ X,XX  
- Dias úteis restantes no mês

Histórico (últimos 6 meses):
Lista de cards por mês:
- Mês/Ano | Meta definida | Resultado | % | Badge "Atingida" (verde) / "Parcial" / "Não atingida" (cinza)

Modal de definir/editar meta:
- Input do valor com slider
- Preview diário/por corrida
- Botão "Salvar"
- POST /api/goals com upsert
```

---

## FASE 4 — Relatórios e Monetização

---

### TASK 4.1 — Relatório PDF

```
Crie a API route em src/app/api/reports/pdf/route.ts.

Verificar sessão e plano premium (se free, retornar 403).

Aceitar query params: month (1-12), year.

Buscar todos os dados do mês:
- Rides do usuário no período
- Expenses do usuário no período
- Vehicle do usuário
- Goal do mês

Calcular:
- Faturamento bruto total
- Total de gastos (por categoria)
- Lucro líquido
- Custo/km do mês
- Corridas por plataforma
- Score de eficiência por turno
- Melhor dia da semana

Gerar PDF com @react-pdf/renderer:
Layout do relatório:
- Cabeçalho: Logo "Piloto" + nome do usuário + "Relatório — [Mês] [Ano]"
- Seção 1: Resumo Financeiro (4 números em destaque)
- Seção 2: Corridas por plataforma (tabela)
- Seção 3: Gastos por categoria (lista)
- Seção 4: Score de eficiência por turno
- Rodapé: "Gerado pelo Piloto em DD/MM/AAAA"

Retornar o PDF como Response com headers:
Content-Type: application/pdf
Content-Disposition: attachment; filename="piloto-relatorio-[mes]-[ano].pdf"
```

---

### TASK 4.2 — Tela de Relatórios

```
Crie src/app/(app)/relatorios/page.tsx.

Seletor de período: dropdowns de Mês e Ano (mês atual por default).

Preview do relatório (Server Component, busca dados do mês selecionado):
6 cards de estatísticas do mês selecionado

Botões de exportação:
- "Baixar relatório PDF" — fetch /api/reports/pdf?month=X&year=Y, baixar o arquivo
- "Exportar corridas CSV" — fetch /api/rides/export com mesmo período, baixar CSV
- "Exportar gastos CSV" — idem para expenses

Para usuário free:
- Botões com ícone Lock
- Tooltip/badge "Premium"
- Ao clicar: redirecionar para /planos

Crie as rotas de exportação CSV:
GET /api/rides/export: retorna CSV com headers corretos
GET /api/expenses/export: retorna CSV com headers corretos
Ambas verificam plano premium.
```

---

### TASK 4.3 — Sistema de Planos e Stripe

```
Configure o sistema de monetização completo.

Crie src/lib/stripe.ts:
- Instância do Stripe com a secret key
- Funções: createCheckoutSession(), createPortalSession(), getSubscription()

Crie a tela de planos src/app/(app)/planos/page.tsx:

Layout de cards lado a lado:

Card Gratuito (borda cinza normal):
- Badge "Seu plano atual" (se for free)
- "R$ 0 / mês"
- Lista de features incluídas com check verde
- Lista de features bloqueadas com X cinza

Card Premium (borda 2px preta se não premium, badge "Recomendado"):
- "R$ 19,90 / mês"
- "Cancele quando quiser" em muted
- Lista completa de features com check verde
- Se já premium: badge "Plano atual" em verde, sem botão de upgrade

Botão "Assinar Premium":
- Chama POST /api/stripe/create-checkout que retorna a URL do Stripe Checkout
- Redireciona para a URL do Stripe

Crie API routes:
POST /api/stripe/create-checkout:
- Verificar sessão
- Criar ou buscar Stripe Customer com o email do usuário
- Criar Checkout Session com:
  - price: STRIPE_PREMIUM_PRICE_ID
  - success_url: /dashboard?upgraded=true
  - cancel_url: /planos
  - customer: stripeCustomerId
- Retornar { url }

POST /api/stripe/create-portal:
- Criar Billing Portal Session para o customer do usuário
- Retornar { url }

POST /api/webhooks/stripe/route.ts:
- Verificar assinatura do webhook (stripe.webhooks.constructEvent)
- Tratar eventos:
  checkout.session.completed → update subscriptions: plan='premium', stripeSubscriptionId, currentPeriodEnd
  customer.subscription.updated → sync status
  customer.subscription.deleted → plan='free', limpar campos
  invoice.payment_failed → manter premium mas marcar (futuro: notificar)
```

---

### TASK 4.4 — Tela de Configurações (todas)

```
Crie o layout compartilhado de configurações em src/app/(app)/configuracoes/layout.tsx:
- Sidebar de configurações à esquerda (no mobile: tabs horizontais)
- Links: Perfil | Veículo | Plano | Conta

Crie src/app/(app)/configuracoes/perfil/page.tsx:
- Formulário com nome e cidade editáveis
- Email (somente leitura com botão "Alterar email" — mostra modal)
- Seção de senha: botão "Alterar senha" abre Dialog com 3 campos (senha atual, nova, confirmar)
- PATCH /api/user/profile para salvar

Crie src/app/(app)/configuracoes/veiculo/page.tsx:
- Mesmo formulário do onboarding de veículo, pré-preenchido
- Campo extra: custo de depreciação por km (R$/km)
- Preview de custo/km atualizado em tempo real
- PATCH /api/vehicle para salvar

Crie src/app/(app)/configuracoes/plano/page.tsx:
Para free:
- Card: "Plano Gratuito" + uso do mês (X de 50 corridas)
- Botão "Fazer upgrade" → /planos

Para premium:
- Card: "Plano Premium" badge verde
- "Próxima cobrança: [data]"
- "Cartão final **** [últimos 4]"
- Botão "Gerenciar assinatura" → cria portal session → redireciona
- Botão "Cancelar plano" vermelho ghost → AlertDialog de confirmação

Crie src/app/(app)/configuracoes/conta/page.tsx:
- Botão "Exportar meus dados" → GET /api/user/export → baixa ZIP com JSONs
- Zona de perigo (border vermelho):
  - Botão "Excluir minha conta"
  - AlertDialog: "Digite EXCLUIR para confirmar"
  - Input de confirmação
  - Botão confirmar desabilitado até digitar "EXCLUIR"
  - DELETE /api/user → apaga todos os dados + redireciona para /
```

---

## FASE 5 — Polimento e Deploy

---

### TASK 5.1 — Landing Page

```
Crie a landing page completa em src/app/(public)/page.tsx.

Seções em ordem:

1. Header fixo:
   Logo "Piloto" à esquerda
   Botões "Entrar" (outline) e "Criar conta grátis" (preto) à direita
   Fundo branco, border-bottom 1px #EEEEEE ao fazer scroll

2. Hero (2 colunas desktop, 1 coluna mobile):
   Esquerda: headline grande + subtítulo + 2 CTAs
   Direita: mockup estilizado do dashboard (pode ser uma div com fundo preto e números fake em branco, simulando o app)
   Fundo: branco

3. Calculadora de lucro real (fundo #F6F6F6):
   3 inputs + botão "Calcular"
   Resultado aparece com animação: lucro líquido em verde, custo/km, lucro/hora

4. Seção de dores (3 cards):
   Fundo branco

5. Seção de features (4 items em grid):
   Fundo branco
   Cada feature: círculo preto com ícone branco + título + descrição

6. Social proof (fundo preto, texto branco):
   "2.000+ motoristas" em destaque
   2 depoimentos em cards com borda branca

7. CTA final + footer

Use framer-motion para animações suaves de entrada (fade up) nas seções.
npm install framer-motion@12.6.0
```

---

### TASK 5.2 — Páginas de Erro e Loading

```
Crie os estados de loading e erro globais.

Crie src/app/(app)/loading.tsx:
- Skeleton da sidebar + skeleton de cards + skeleton de gráficos
- Use o componente Skeleton do shadcn

Crie skeletons específicos:
- src/components/dashboard/dashboard-skeleton.tsx
- src/components/rides/rides-table-skeleton.tsx

Crie src/app/not-found.tsx:
- "404" bold grande
- "Página não encontrada"
- Botão "Voltar para o Dashboard"

Crie src/app/error.tsx (error boundary do Next.js):
- "Algo deu errado"
- Botão "Tentar novamente" (chama reset())
- Botão "Ir para o Dashboard"

Configure Sentry para capturar erros automaticamente:
npm install @sentry/nextjs@8
npx @sentry/wizard@latest -i nextjs
```

---

### TASK 5.3 — Segurança e Headers

```
Configure os headers de segurança do Next.js.

Em next.config.ts, adicione headers de segurança para todas as rotas:
- X-DNS-Prefetch-Control: on
- Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- Content-Security-Policy: configurado para Next.js (self, scripts trusted)

Configure CORS nas API routes:
- Apenas aceitar origens da NEXT_PUBLIC_APP_URL

Adicione rate limiting global com a biblioteca 'rate-limiter-flexible':
npm install rate-limiter-flexible@5.0.3
Crie src/lib/rate-limiter.ts com limiters diferentes:
- auth: 5 req / 15 min por IP
- api: 100 req / 1 min por userId
- webhook: sem limite (validação por assinatura)

Aplique o rate limiter como wrapper nas API routes de auth e nas routes principais.

Valide que todas as mutations verificam que o recurso pertence ao usuário logado (ownership check) antes de qualquer operação de update ou delete.
```

---

### TASK 5.4 — Deploy no VPS

```
Crie os scripts e configurações de deploy.

Crie o arquivo ecosystem.config.js para PM2:
module.exports = {
  apps: [{
    name: 'piloto',
    script: 'node_modules/.bin/next',
    args: 'start',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}

Crie o script scripts/deploy.sh:
- git pull origin main
- npm ci
- npm run build
- npx drizzle-kit migrate
- pm2 reload piloto --update-env

Crie .github/workflows/deploy.yml para GitHub Actions:
- Trigger: push na branch main
- Steps: checkout → setup node 22 → npm ci → typecheck → lint → build → SSH deploy no VPS

Crie o Dockerfile (opcional, para containerizar):
- Base: node:22-alpine
- Multi-stage: builder + runner
- Expõe porta 3000

Crie o arquivo nginx.conf com a configuração completa (proxy para porta 3000, SSL, headers de segurança, gzip).

Crie o script scripts/setup-vps.sh com os comandos de setup inicial:
- Atualizar sistema (apt update && apt upgrade)
- Instalar Node.js 22 via nvm
- Instalar PM2 globalmente
- Instalar PostgreSQL 17
- Configurar usuário do banco
- Instalar Nginx e Certbot
- Configurar firewall (ufw)
```

---

## Ordem de Execução Recomendada

```
TASK 0.1 → 0.2 → 0.3 → 0.4 → 0.5
TASK 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7
TASK 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6
TASK 3.1 → 3.2 → 3.3
TASK 4.1 → 4.2 → 4.3 → 4.4
TASK 5.1 → 5.2 → 5.3 → 5.4
```

**Regra de ouro para o Cursor:** Execute uma task de cada vez. Valide que funciona antes de avançar para a próxima. Em caso de erro, resolva antes de prosseguir — erros acumulados são muito mais difíceis de debugar.