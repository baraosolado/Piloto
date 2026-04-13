# Piloto — imagem opcional (multi-stage)
# Build: docker build -t piloto:latest .
# Run:  docker run --env-file .env.local -p 3000:3000 piloto:latest
#
# Banco: use DATABASE_URL apontando para host acessível pelo container (não "localhost" do host).

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
# O lock foi gerado com legacy-peer-deps (ver .npmrc). Sem esta flag, `npm ci` quebra no Linux/Docker.
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# ── Build-time: obrigatórios para importar @/db e @/lib/auth (não há .env.local na imagem)
#     Easypanel/GitHub: passe os mesmos valores reais via --build-arg.
#     O build não precisa alcançar o Postgres; só precisa existir uma URL válida em formato.
ARG DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/piloto_build
ENV DATABASE_URL=$DATABASE_URL

ARG BETTER_AUTH_URL=http://127.0.0.1:3000
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL

ARG BETTER_AUTH_SECRET=00000000000000000000000000000000
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET

ARG NEXT_PUBLIC_APP_URL=https://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Opcionais (Sentry no cliente / upload de source maps)
ARG NEXT_PUBLIC_SENTRY_DSN=
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN=
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN apk add --no-cache curl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
# Migrations na subida do container (tabela users, sessions, etc.)
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src/db ./src/db
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY scripts/run-cron-tasks.sh ./scripts/run-cron-tasks.sh
COPY scripts/load-dotenv.mjs ./scripts/load-dotenv.mjs
COPY scripts/verify-db-schema.mjs ./scripts/verify-db-schema.mjs
COPY scripts/bootstrap-super-admin.mjs ./scripts/bootstrap-super-admin.mjs
COPY scripts/reset-db-dev.mjs ./scripts/reset-db-dev.mjs
RUN chmod +x ./scripts/docker-entrypoint.sh ./scripts/run-cron-tasks.sh \
  && chown -R nextjs:nodejs ./src/db ./scripts ./drizzle.config.ts ./tsconfig.json

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=8s --start-period=70s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
