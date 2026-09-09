# Fase 1 — Checklist de segurança e testes

Status de cada item do [plano](../plano-vende-no-zap.md) para a Fase 1.

- [x] **Senhas nunca armazenadas em texto puro.**
  Delegado inteiramente ao Supabase Auth (hash + salt do lado do provedor);
  a aplicação nunca vê nem guarda a senha em texto puro em nenhum momento.

- [x] **Row Level Security (RLS) ativado no Postgres.**
  Todas as tabelas de dados (`contacts`, `conversations`, `deals`,
  `subscriptions`, `profiles`) têm RLS habilitado e políticas que só
  liberam linhas onde `auth.uid() = user_id` — ver
  [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
  A tabela `subscriptions` só tem policy de `select` para o usuário comum:
  criação/alteração de assinatura fica reservada a chamadas com a
  `service_role` key (webhook de pagamento, Fase 4).

- [x] **Variáveis de ambiente fora do repositório.**
  `.env*` está no `.gitignore` (com exceção explícita de `.env.example`,
  que não tem segredo nenhum). Em produção, as chaves vão no painel da
  Vercel como env vars, nunca commitadas.

- [ ] **HTTPS obrigatório em todos os ambientes.**
  Vercel força HTTPS por padrão — item fecha sozinho no deploy (Fase 5).
  Em desenvolvimento local (`http://localhost`) isso não se aplica.

- [x] **Rate limit no endpoint de login.**
  O login roda direto contra a API do Supabase Auth (não existe um
  endpoint próprio de login nesta aplicação para proteger) — o
  Supabase já aplica rate limiting nativo por IP/e-mail nas rotas de
  auth. Antes de lançar comercialmente (Fase 5), considerar reforçar com
  um limiter próprio (ex.: Upstash Redis, já deixado como variável de
  ambiente opcional em `.env.example`) para ganhar uma segunda camada de
  defesa contra força bruta distribuída.

- [x] **Teste manual: criar dois usuários e tentar acessar dados de um
  logado como o outro, direto pela API.**
  Rodado em 09/09/2026 contra o projeto Supabase real, via API (dois
  usuários de teste criados pela Admin API, autenticados via
  `grant_type=password`, dados e contas apagados ao final — nada ficou
  no banco). Resultado das 4 tentativas, autenticado como usuário B:

  | Tentativa | Resultado |
  |---|---|
  | `GET /rest/v1/contacts` (ler contato da conta A) | `[]` — vazio |
  | `PATCH /rest/v1/deals?id=eq.<id de A>` (mudar estágio) | `[]` — 0 linhas afetadas, estágio de A intacto |
  | `DELETE /rest/v1/contacts?id=eq.<id de A>` | `[]` — 0 linhas afetadas, contato de A intacto |
  | `GET /rest/v1/waitlist_signups` (autenticado, não é service_role) | `[]` — vazio |

  RLS aprovado nas 4 frentes. Também confirmado nesta mesma sessão:
  insert anônimo na waitlist funciona (201) e a leitura anônima
  imediatamente depois continua vazia — o modelo "caixa de correio"
  descrito no checklist da Fase 0 se comporta como esperado na prática,
  não só na teoria da política SQL.

## Observações de arquitetura

- Multi-tenancy não depende de nenhum `WHERE user_id = ...` escrito à mão
  no código da aplicação — a proteção vive no banco via RLS. Isso é
  deliberado: elimina a classe de bug mais comum e mais cara desse tipo de
  produto (esquecer o filtro em uma query nova).
- Valores monetários já nascem modelados como inteiro (`value_cents`),
  antecipando o checklist da Fase 4 (cobrança Pix).
- `subscriptions` é criada automaticamente (trigger `handle_new_user`) no
  cadastro, já em `trialing` por 14 dias — a Fase 5 só precisa plugar o
  gateway de pagamento para transicionar o status.
