# Vende no Zap — Relatório completo do projeto

**Data:** 09/09/2026
**Repositório:** [github.com/RicardoJuliano/vende-no-zap](https://github.com/RicardoJuliano/vende-no-zap) (privado)
**Produção:** [vende-no-zap.vercel.app](https://vende-no-zap.vercel.app)
**Banco:** Supabase (`npdcxswedzfqsxkkszqj`)

Este documento explica o que o projeto é, como cada parte técnica funciona,
as decisões tomadas e por quê, e o que falta para o produto virar negócio de
verdade. Serve como referência única — não precisa ler o histórico de commits
pra entender o estado atual.

---

## 1. O que é o produto

CRM leve para quem vende pelo WhatsApp: autônomos, lojas de bairro, salões,
clínicas, prestadores de serviço. A dor que resolve: gente esquece de
responder orçamento, perde venda por falta de follow-up, não tem sistema
nenhum além da memória e dos favoritos do WhatsApp.

**Modelo de negócio:** assinatura mensal (R$ 97–197/conta), custo de infra
quase zero por cliente (Supabase + Vercel no plano gratuito suportam o
volume inicial tranquilamente).

**Regra de execução adotada:** o código está sempre um passo à frente da
validação, mas nenhuma fase de produto avança sem prova de que existe
cliente pagante. Isso está formalizado no arquivo
[`vende-no-zap-proximos-passos.md`](../vende-no-zap-proximos-passos.md).

O plano completo, fase a fase, está em
[`plano-vende-no-zap.md`](../plano-vende-no-zap.md).

---

## 2. Estado atual — visão rápida

| Item | Status |
|---|---|
| Repositório GitHub privado | ✅ |
| Fundação técnica (auth, banco, multi-tenancy) | ✅ |
| Landing page + lista de espera | ✅ |
| Rate limit e correção de enumeração na waitlist | ✅ |
| Deploy público (Vercel) | ✅ |
| Projeto Supabase real ativo, migrações rodadas | ✅ |
| Teste de isolamento entre contas (RLS) | ✅ aprovado |
| CI (lint + testes + build a cada push) | ✅ |
| 10+ entrevistas de validação com clientes reais | ⏳ pendente — só o dono do projeto faz isso |
| Fase 2 (funil kanban) | 🔒 bloqueada de propósito até a validação acima |

---

## 3. Arquitetura e por que cada peça foi escolhida

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend/backend | Next.js 16 (App Router, TypeScript) + Tailwind | Um único projeto serve landing, app e API; SSR de fábrica |
| Banco de dados | PostgreSQL via Supabase | Relacional, com Row Level Security nativo |
| Autenticação | Supabase Auth (e-mail/senha + Google OAuth) | Não reinventar hash de senha, confirmação de e-mail, OAuth |
| Isolamento multi-tenant | RLS no Postgres, não filtro na aplicação | Um bug no código não consegue vazar dado de outro usuário — o banco recusa na borda |
| Validação de formulário | Zod | Mesmo schema documenta e valida no servidor |
| Testes | Vitest + Testing Library | Roda rápido com Next 16 + React 19 |
| Rate limit | Upstash Redis (opcional) com fallback em memória | Funciona entre instâncias serverless quando configurado |
| CI | GitHub Actions | Lint + testes + build a cada push/PR |
| Deploy | Vercel, conectado ao GitHub | Deploy automático a cada push em `main` |

**Divergência deliberada do plano original:** a Fase 0 previa uma landing
page solta, sem back-end. Como a fundação técnica (Fase 1) já estava pronta,
a lista de espera foi encaixada no mesmo Supabase em vez de montar uma
segunda stack só para isso — menos peças móveis, mesmo resultado.

---

## 4. Como a autenticação funciona

1. **Cadastro** (`/signup`) e **login** (`/login`) são Client Components que
   chamam o SDK do Supabase Auth direto do navegador
   (`src/lib/supabase/client.ts`), tanto para e-mail/senha quanto para
   "Continuar com Google".
2. O Supabase guarda a sessão em cookies compatíveis entre navegador e
   servidor (biblioteca `@supabase/ssr`).
3. **`src/proxy.ts`** (o antigo `middleware.ts` — renomeado por causa da
   convenção nova do Next 16) roda em toda requisição:
   - Renova o token de sessão antes que expire.
   - Bloqueia `/dashboard` para quem não está logado (redireciona pra `/login`).
   - Redireciona quem já está logado para longe de `/login` e `/signup`.
4. **`/auth/callback`** é o destino do login social e do link de confirmação
   de e-mail: troca o `code` da URL por uma sessão válida.
5. No cadastro, um **trigger no Postgres** (`handle_new_user`, em
   `0001_init.sql`) cria automaticamente:
   - Uma linha em `profiles` com nome e e-mail.
   - Uma linha em `subscriptions` com plano `trial` por 14 dias.

Senha nunca é vista nem guardada pela aplicação — fica inteiramente a cargo
do Supabase Auth (hash + salt do lado do provedor).

---

## 5. Como o banco e o isolamento multi-tenant funcionam

### Tabelas (`supabase/migrations/0001_init.sql`)

| Tabela | Papel | RLS |
|---|---|---|
| `profiles` | Dados do dono da conta (nome, e-mail) | Cada um só lê/edita o próprio |
| `contacts` | Leads/clientes do usuário | Isolado por `user_id = auth.uid()` |
| `conversations` | Vínculo com o WhatsApp (populado na Fase 3) | Isolado por `user_id` |
| `deals` | Orçamento/venda em andamento, com estágio do funil | Isolado por `user_id` |
| `subscriptions` | Plano e status de pagamento | Usuário só **lê** o próprio; escrita reservada à `service_role` (webhook de pagamento, Fase 4) |

**Como o isolamento funciona na prática:** toda tabela de dado do cliente
tem uma coluna `user_id`, e uma política SQL do tipo:

```sql
create policy "contacts: isolado por dono"
  on public.contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Isso significa que **mesmo que o código da aplicação tenha um bug** e
esqueça de filtrar uma query por usuário, o Postgres recusa devolver ou
alterar qualquer linha que não pertença a quem está autenticado. A proteção
não depende de disciplina de quem escreve a query — está no banco.

**Valores monetários** (`deals.value_cents`) já nascem como inteiro
(centavos), nunca float — evita todo o problema clássico de arredondamento
de ponto flutuante em dinheiro, antecipando a Fase 4 (cobrança Pix).

### Prova real de que funciona (09/09/2026)

Rodado contra o projeto Supabase de produção, via API REST, com dois
usuários de teste criados e depois apagados:

| Tentativa, autenticado como usuário B | Resultado |
|---|---|
| Ler contatos da conta A | `[]` — vazio |
| Mudar o estágio de um deal da conta A | 0 linhas afetadas |
| Apagar um contato da conta A | 0 linhas afetadas |
| Ler a tabela `waitlist_signups` autenticado (não é `service_role`) | `[]` — vazio |

Detalhes completos em
[`docs/fase-1-checklist-seguranca.md`](./fase-1-checklist-seguranca.md).

---

## 6. Como a landing page e a lista de espera funcionam

A home (`/`, em `src/app/page.tsx`) é a landing page real da Fase 0: dor do
público-alvo, promessa do produto, formulário de lista de espera.

### O formulário (`src/app/waitlist-form.tsx` + `src/app/actions/waitlist.ts`)

1. Campos: **nome**, **telefone** (obrigatórios), **e-mail** (opcional) — só
   isso, por definição do checklist de segurança da fase (nada de CPF ou
   dado sensível).
2. Um campo escondido (`website`) funciona como **honeypot**: pessoas nunca
   preenchem, bots costumam preencher — se vier preenchido, a submissão é
   descartada em silêncio (a resposta parece sucesso, mas nada é gravado).
3. **Rate limit**: no máximo 5 envios por hora por IP
   (`src/lib/rate-limit.ts`). Usa Upstash Redis quando configurado
   (funciona corretamente com múltiplas instâncias serverless); sem essas
   variáveis, cai num fallback em memória, documentado como válido só para
   uma instância por vez.
4. **Deduplicação por telefone**: a tabela `waitlist_signups` tem um índice
   único sobre o telefone normalizado (só dígitos), então a mesma pessoa
   preenchendo duas vezes não vira dois leads.
5. **Resposta uniforme**: cadastro novo, telefone repetido e honeypot de bot
   devolvem exatamente a mesma mensagem de sucesso. Isso evita um ataque de
   enumeração — sem isso, dava pra usar o formulário público para descobrir
   se um telefone específico de terceiro já estava cadastrado.

### A tabela `waitlist_signups` (`supabase/migrations/0002_waitlist.sql`)

RLS ativado com uma única política: **qualquer visitante anônimo pode
inserir** (é o formulário), mas **ninguém lê, edita ou apaga** pela API —
nem um usuário autenticado comum. Só a `service_role` key (uso interno,
painel do Supabase) enxerga os leads. É o modelo "caixa de correio":
qualquer um deposita uma carta, só o dono tem a chave da caixa.

### O botão de WhatsApp

`src/lib/config.ts` define `WHATSAPP_NUMBER`, hoje em branco de propósito.
O botão "Prefere falar direto no WhatsApp?" só aparece na página quando
esse valor for preenchido — não existe link quebrado no ar.

---

## 7. Testes e qualidade

- **14 testes automatizados** (Vitest + Testing Library), cobrindo:
  validação de formulários (auth e waitlist), o rate limiter, e a
  renderização da landing page.
- **ESLint** limpo.
- **Build de produção** (`next build`, Turbopack) compila e tipa sem erros.
- **CI** (`.github/workflows/ci.yml`): lint + testes + build a cada push ou
  pull request na branch `main`.

Comandos:

```bash
npm run dev         # servidor de desenvolvimento
npm run build       # build de produção (roda o typecheck do TS junto)
npm run lint        # ESLint
npm run test        # testes (Vitest, uma vez)
npm run test:watch  # testes em modo watch
```

---

## 8. Deploy — como o site vai ao ar

1. Projeto criado na Vercel (`vende-no-zap`), linkado ao repositório
   `RicardoJuliano/vende-no-zap`, branch `main`.
2. **Todo `git push` em `main` dispara um deploy automático** — não precisa
   de passo manual depois da primeira configuração.
3. A proteção "Vercel Authentication" (SSO), que vem ligada por padrão em
   projeto novo e bloquearia qualquer visitante com uma tela de login da
   Vercel, foi **desligada deliberadamente** — o objetivo da Fase 0 é
   divulgar o link publicamente.
4. Variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) configuradas manualmente no painel da
   Vercel — é o único passo que precisou de ação humana, porque nenhuma
   ferramenta disponível permite configurar env vars de projeto Vercel
   remotamente.

Detalhes em [`docs/deploy-vercel.md`](./deploy-vercel.md).

---

## 9. Chaves e variáveis de ambiente

O Supabase deste projeto usa o **novo formato de chaves** (`sb_publishable_…`
/ `sb_secret_…`, substituindo o antigo par anon/service_role baseado em JWT).

| Variável | O que é | Onde pode aparecer |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto (`https://xxxx.supabase.co`) | Cliente e servidor — pública por design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave **publishable** (`sb_publishable_…`) | Cliente e servidor — pública por design, é o que aplica RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave **secreta** (`sb_secret_…`) | **Só** em código de servidor que precisa ignorar RLS (webhooks das Fases 3/4) — nunca em variável `NEXT_PUBLIC_*` |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Opcional, rate limit real e compartilhado | Servidor |

⚠️ Ponto de atenção real desta sessão: a chave secreta (`sb_secret_…`) quase
foi parar numa variável `NEXT_PUBLIC_*` durante a configuração manual —
teria vazado acesso total ao banco (bypassa RLS) para qualquer visitante do
site, já que variáveis `NEXT_PUBLIC_*` são embutidas no JavaScript que roda
no navegador. Foi corrigido antes de qualquer deploy com esse valor.

`.env.local` nunca é commitado (`.gitignore`); `.env.example` documenta as
variáveis sem valores reais.

---

## 10. Estrutura do repositório

```
vende-no-zap/
├── src/app/
│   ├── page.tsx              landing page (Fase 0)
│   ├── waitlist-form.tsx     formulário da lista de espera
│   ├── actions/waitlist.ts   server action: valida, limita, grava
│   ├── login/, signup/       autenticação (Supabase Auth)
│   ├── auth/callback/        troca de código OAuth por sessão
│   ├── dashboard/            área logada (placeholder da Fase 2)
│   └── proxy.ts              middleware de sessão e rotas protegidas
├── src/lib/
│   ├── supabase/             clients de browser e servidor
│   ├── validations/          schemas zod (auth, waitlist)
│   ├── rate-limit.ts         limiter (Upstash ou memória)
│   ├── request-ip.ts         extrai IP do visitante
│   └── config.ts             WHATSAPP_NUMBER (em branco)
├── supabase/migrations/
│   ├── 0001_init.sql         profiles, contacts, conversations, deals, subscriptions
│   └── 0002_waitlist.sql     waitlist_signups
├── docs/
│   ├── fase-0-checklist-seguranca.md
│   ├── fase-0-roteiro-entrevistas.md
│   ├── fase-0-prospects-template.csv
│   ├── fase-1-checklist-seguranca.md
│   ├── deploy-vercel.md
│   └── relatorio-completo.md      (este arquivo)
├── .github/workflows/ci.yml  lint + testes + build no push/PR
├── plano-vende-no-zap.md               plano completo, fase a fase
└── vende-no-zap-proximos-passos.md     roteiro de execução em etapas
```

---

## 11. Histórico de commits

| Commit | Resumo |
|---|---|
| `31c8a54` | Fase 1: fundação técnica (Next.js, auth, schema com RLS, testes) |
| `1693c06` | CI, docs, migração `middleware.ts` → `proxy.ts` (Next 16) |
| `a4c51fa` | Fase 0: landing page com lista de espera |
| `e1dda2f` | Etapa 3: rate limit e resposta uniforme na waitlist |
| `1a76a21` | Etapa 4: projeto Vercel criado e linkado ao GitHub |
| `8ad0307` | Etapa 1 e 2 concluídas: Supabase real ativo, RLS testado |

---

## 12. O que falta — e por que não é técnico

A única etapa pendente é a **Etapa 5**: rodar 10+ conversas reais com donos
de negócio que vendem pelo WhatsApp, usando o roteiro pronto em
[`docs/fase-0-roteiro-entrevistas.md`](./fase-0-roteiro-entrevistas.md) e a
planilha [`docs/fase-0-prospects-template.csv`](./fase-0-prospects-template.csv).

**Critério de decisão:**
- **5+ pessoas dizendo "eu pagaria" com valor concreto** → Fase 2 (funil
  kanban) liberada.
- **Menos que isso** → não é sinal de acelerar, é sinal de revisar a dor ou
  o público antes de investir mais tempo de desenvolvimento. O projeto para
  na Fase 1 e já vira material de portfólio — o que também tem valor.

Nenhuma automação substitui essa etapa. É, deliberadamente, o único gargalo
que resta.
