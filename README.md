# Vende no Zap

CRM leve para quem vende pelo WhatsApp, com cobrança Pix embutida. Ver
[`plano-vende-no-zap.md`](./plano-vende-no-zap.md) para o plano completo de
construção, fase a fase.

**Status:** Fase 1 (fundação técnica) concluída — login, banco e isolamento
multi-tenant funcionando. Fase 0 (landing page + lista de espera) também no
código; falta só você rodar as conversas reais com clientes (ver
[`docs/fase-0-roteiro-entrevistas.md`](./docs/fase-0-roteiro-entrevistas.md)).
Fase 2 (funil visual) é a próxima.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) + [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres, Auth (e-mail/senha + Google) e Row Level Security
- [Zod](https://zod.dev) para validação de formulários
- [Vitest](https://vitest.dev) + Testing Library para testes

## Configurar o projeto

### 1. Criar o projeto no Supabase

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com) (plano gratuito serve).
2. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
3. Em **Authentication → Providers**, ative **Google** se for usar login social
   (precisa de um Client ID/Secret OAuth do [Google Cloud Console](https://console.cloud.google.com/)
   com a redirect URI que o Supabase mostra na tela).
4. Em **SQL Editor**, cole e rode, nesta ordem, o conteúdo de:
   - [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)
     — cria `profiles`, `contacts`, `conversations`, `deals`, `subscriptions`,
     todas com Row Level Security.
   - [`supabase/migrations/0002_waitlist.sql`](./supabase/migrations/0002_waitlist.sql)
     — cria `waitlist_signups` (lista de espera da landing page da Fase 0).

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os
valores copiados acima.

### 3. Rodar localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Crie uma conta em
`/signup` — se a confirmação de e-mail estiver ativada no projeto Supabase
(padrão), confira sua caixa de entrada antes de conseguir logar.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Build de produção (roda o typecheck do TS junto) |
| `npm run lint` | ESLint |
| `npm run test` | Testes (Vitest, uma vez) |
| `npm run test:watch` | Testes em modo watch |

## Segurança e multi-tenancy

Todo isolamento entre contas é garantido por **Row Level Security no
Postgres** (veja a migração SQL), não por filtros na aplicação. Isso é
proposital: mesmo que uma query no código esqueça um `where user_id = ...`,
o banco recusa devolver linha de outro usuário. Veja os checklists completos
em [`docs/fase-0-checklist-seguranca.md`](./docs/fase-0-checklist-seguranca.md)
e [`docs/fase-1-checklist-seguranca.md`](./docs/fase-1-checklist-seguranca.md).

## Próximos passos (Fase 2)

Funil visual (kanban), cadastro de contatos, anotações e lembretes de
follow-up — ver a seção "Fase 2" do plano.
