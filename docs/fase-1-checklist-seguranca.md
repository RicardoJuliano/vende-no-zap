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

- [ ] **Teste manual: criar dois usuários e tentar acessar dados de um
  logado como o outro, direto pela API.**
  Requer um projeto Supabase real (ver `README.md`). Roteiro para rodar
  assim que o projeto estiver no ar:
  1. Criar usuário A, logar, criar 1 registro em `contacts`.
  2. Copiar o `access_token` da sessão de A (DevTools → Application →
     Cookies, ou `supabase.auth.getSession()` no console).
  3. Criar usuário B, logar normalmente pela aplicação — o dashboard
     deve mostrar `0` contatos (prova visual de isolamento).
  4. Com o token de A ainda válido, chamar a REST API do Supabase
     (`GET {SUPABASE_URL}/rest/v1/contacts` com o header
     `Authorization: Bearer <token de B>` e o `apikey` anônimo) logado
     como B — a resposta deve vir vazia mesmo que A tenha registros.
  5. Repetir tentando um `POST`/`PATCH` no `id` de um contato de A
     autenticado como B — deve retornar vazio/erro, nunca alterar o dado.

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
