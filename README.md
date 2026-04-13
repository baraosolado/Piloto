This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Deploy no VPS (Ubuntu 24.04, PM2, Nginx, PostgreSQL)

| Arquivo | Uso |
|--------|-----|
| `ecosystem.config.js` | PM2 (`copilote`) — `next start` (fork, 1 instância) |
| `scripts/setup-vps.sh` | Setup inicial do servidor (uma vez, `sudo`) |
| `scripts/deploy.sh` | Git pull, `npm ci`, build, migrations, reload PM2 |
| `docs/deploy-easypanel.md` | **Easypanel + Docker:** build args, env, health, crons (`run-cron-tasks.sh`) |
| `scripts/backup-db.sh` | Dump PostgreSQL (`DATABASE_URL` no `.env.local` ou `PGPASSWORD`) |
| `nginx/copilote.conf` | Modelo Nginx — trocar `SEU_DOMINIO.COM.BR` |
| `.github/workflows/deploy.yml` | CI opcional — secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` |

Alinhar `copilote_db`, `copilote_user` e `/var/www/copilote` com o seu `.env.local` no servidor.

O `deploy.sh` usa **`npm ci` completo** (inclui devDependencies): `next build` e `drizzle-kit migrate` precisam de TypeScript e `drizzle-kit`.

### Comandos úteis no servidor

```bash
pm2 status
pm2 logs copilote
pm2 logs copilote --err
pm2 reload copilote --update-env
pm2 stop copilote
pm2 monit
bash scripts/deploy.sh
npm run db:backup
ls -lh /var/backups/copilote-db/
gunzip -c /var/backups/copilote-db/ARQUIVO.sql.gz | psql -U copilote_user -d copilote_db
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Linux: `chmod +x scripts/deploy.sh scripts/setup-vps.sh scripts/backup-db.sh scripts/run-cron-tasks.sh scripts/apply-rls.sh scripts/verify-rls.sh scripts/restore-backup.sh scripts/install-backup-cron.sh scripts/pm2-setup-logrotate.sh scripts/pm2-persist.sh`. Outro diretório de app: `APP_DIR=/caminho bash scripts/deploy.sh`.

RLS (staging): `CONFIRM_RLS_APPLY=1 DATABASE_URL=... bash scripts/apply-rls.sh` — ver `SECURITY-GAPS.md` §1.

**Easypanel (VPS):** ver [docs/deploy-easypanel.md](docs/deploy-easypanel.md) — health `GET /api/health`, crons não usam `vercel.json`.
