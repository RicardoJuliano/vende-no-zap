# Vende no Zap

CRM leve para quem vende pelo WhatsApp, com cobrança Pix embutida. Ver
[`plano-vende-no-zap.md`](./plano-vende-no-zap.md) para o plano completo de
construção, fase a fase.

**Status:** Fases 0, 1 e 2 concluídas — landing + lista de espera, login e
banco com isolamento multi-tenant, e o funil kanban (contatos, anotações,
lembretes de follow-up) funcionando e verificado contra o banco real. Falta
só você rodar as conversas reais com clientes (ver
[`docs/fase-0-roteiro-entrevistas.md`](./docs/fase-0-roteiro-entrevistas.md))
— é o único critério que decide se o projeto segue pra Fase 3.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) + [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres, Auth (e-mail/senha + Google) e Row Level Security
- [Zod](https://zod.dev) para validação de formulários
- [Vitest](https://vitest.dev) + Testing Library para testes
- [dnd-kit](https://dndkit.com) para o drag-and-drop do funil (com fallback por `<select>`, sem depender só de arrastar)

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
   - [`supabase/migrations/0003_contact_notes.sql`](./supabase/migrations/0003_contact_notes.sql)
     — cria `contact_notes` (anotações por contato da Fase 2).
   - [`supabase/migrations/0004_fix_cross_owner_contact_id.sql`](./supabase/migrations/0004_fix_cross_owner_contact_id.sql)
     — corrige uma brecha de autorização achada testando a Fase 2 (ver
     [`docs/relatorio-fase-2.md`](./docs/relatorio-fase-2.md)).

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
| `npm run seed:demo` | Popula a conta de demonstração (ver abaixo) |

## Conta de demonstração

Pra demonstrar o produto ao vivo (nas entrevistas de validação, por
exemplo) sem depender de dado real: `npm run seed:demo` cria — ou
reaproveita, se já existir — uma conta com login normal (e-mail/senha) e
preenche o funil com ~15 contatos fictícios, deals em todos os 5 estágios,
anotações com cara de uso real e pelo menos 2 lembretes de follow-up já
"atrasados" o suficiente pra aparecer no dashboard.

1. Defina `DEMO_ACCOUNT_EMAIL` e `DEMO_ACCOUNT_PASSWORD` no `.env.local`
   (nunca a sua conta real — são credenciais só dessa conta de demo).
2. Rode:
   ```bash
   npm run seed:demo
   ```
3. Entre em `/login` com essas credenciais.

Rodar de novo **não duplica**: cada execução apaga os dados antigos da
conta demo (contatos, deals e anotações) e insere o dataset de
[`src/lib/demo-dataset.ts`](./src/lib/demo-dataset.ts) do zero — sempre no
mesmo estado, pronto pra próxima demo.

## Segurança e multi-tenancy

Todo isolamento entre contas é garantido por **Row Level Security no
Postgres** (veja a migração SQL), não por filtros na aplicação. Isso é
proposital: mesmo que uma query no código esqueça um `where user_id = ...`,
o banco recusa devolver linha de outro usuário. Veja os checklists completos
em [`docs/fase-0-checklist-seguranca.md`](./docs/fase-0-checklist-seguranca.md),
[`docs/fase-1-checklist-seguranca.md`](./docs/fase-1-checklist-seguranca.md) e
[`docs/fase-2-checklist-seguranca.md`](./docs/fase-2-checklist-seguranca.md).

## Próximos passos

O código está pronto para demonstração. O que falta é a Etapa 5 do roteiro
([`vende-no-zap-proximos-passos.md`](./vende-no-zap-proximos-passos.md)):
10+ conversas reais com donos de negócio. A Fase 3 (integração com
WhatsApp) só começa se as entrevistas confirmarem que existe cliente
pagante.
