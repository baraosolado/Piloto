# Decisões de dependências e `npm audit` (SECURITY-GAPS §4.4)

Última revisão: abr/2026.

## O que já foi feito

- `npm audit fix` (sem `--force`) para corrigir o que não exige major/breaking.
- **better-auth** fixado em **`1.2.7`** (versão exata no `package.json`) para manter compatibilidade com o código atual. Subir para **1.5+** exige revisão de breaking changes e testes de auth (reset de senha, sessão, etc.).

## Vulnerabilidades que ainda aparecem no `npm audit`

| Pacote / área | Nota |
|----------------|------|
| **next** 15.2.x | Vários CVEs listados para a série 15.x até 15.5.14. Plano: testar **upgrade para 15.5.x** (e `eslint-config-next` alinhado) num branch, `npm run build`, smoke E2E, depois produção. |
| **drizzle-orm** &lt; 0.45.2 | Fix com `npm audit fix --force` — breaking; planear upgrade Drizzle + regressão queries. |
| **drizzle-kit** / **esbuild** | Transitivo do `drizzle-kit`; impacto sobretudo em **dev/build**, não em runtime do browser. |

## Processo recomendado

1. Mensalmente: `npm audit` no CI (`security-audit.yml`) e revisar PRs Dependabot.
2. Antes de bump major: branch dedicado, build, testes manuais dos fluxos críticos (login, Stripe, export).
3. Registar aqui ou no PR a decisão quando se aceita risco residual (ex.: Next patch pendente).
