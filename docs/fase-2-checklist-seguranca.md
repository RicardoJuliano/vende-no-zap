# Fase 2 — Checklist de segurança e testes

Escrito **antes** do primeiro commit de código da Fase 2, como manda o
roteiro (`vende-no-zap-proximos-passos.md`, Etapa 6). Cada item vira uma
verificação concreta no fim da fase, não uma promessa vaga.

## Escopo desta fase (referência)

Liberada em **modo paralelo** com a Etapa 5 (entrevistas de validação
rodando ao mesmo tempo) — por isso o escopo é o mínimo do plano, sem nada
extra, e os detalhes finos (nomes de estágio, tipos de lembrete) ficam
centralizados para mudar fácil quando as entrevistas voltarem:

1. Funil kanban em `/dashboard`: 5 colunas, cards arrastáveis, persistindo
   `deals.stage`.
2. Cadastro rápido de contato: nome + telefone obrigatórios, resto
   opcional.
3. Anotações por contato com data automática.
4. Lembretes de follow-up visíveis no dashboard (sem e-mail/push ainda).
5. Mobile-first.

## Itens do checklist

- [x] **Validação de entrada no servidor em todos os formulários.**
  `src/lib/validations/pipeline.ts`: `quickContactSchema` (nome/telefone
  obrigatórios), `contactNoteSchema` (corpo não vazio, máx. 2000
  caracteres), `dealStageSchema` (só uma das 5 chaves de
  `DEAL_STAGE_KEYS`, nunca uma string solta). As três server actions
  (`src/app/dashboard/pipeline-actions.ts`) validam com esses schemas
  antes de tocar no banco.

- [x] **Proteção contra XSS: anotações e nomes de contato são texto de
  usuário.**
  `grep -rn "dangerouslySetInnerHTML" src/` → zero resultados. Todo texto
  de usuário (nome, telefone, corpo da anotação) é renderizado via
  interpolação JSX normal (`{contact.name}`, `{note.body}`), que o React
  escapa por padrão.

- [x] **Queries sempre parametrizadas via SDK do Supabase.**
  `grep` por SQL cru fora de `supabase/migrations/` → zero resultados.
  Toda leitura/escrita passa por `.from("tabela").select/insert/update()`
  do cliente JS.

- [x] **Autorização em cada operação (mover card, editar contato, apagar
  anotação).**
  Cada server action confirma a sessão (`requireUser()`) e filtra
  explicitamente por `user_id` — não confia só no RLS silencioso.
  **Mas o teste de isolamento (ver abaixo) achou um buraco real que essa
  descrição não previa:** as policies de `deals` e `conversations`
  (desde a Fase 1) e a nova `contact_notes` conferiam `user_id`, mas não
  se o `contact_id` referenciado pertencia ao mesmo dono. Um usuário B
  conseguia criar `deal`/anotação apontando pro contato de A. Corrigido em
  [`0004_fix_cross_owner_contact_id.sql`](../supabase/migrations/0004_fix_cross_owner_contact_id.sql)
  com a função `user_owns_contact()`, reaplicada nas 3 tabelas. Reteste
  confirmou: bloqueado (`403`), sem quebrar o fluxo legítimo.

- [x] **Teste de carga leve: 500 contatos numa conta, funil continua
  fluido.**
  Rodado em 09/09/2026 contra o projeto Supabase real: 500 contatos +
  500 deals inseridos em lote (~900ms e ~450ms respectivamente — só o
  tempo do insert em massa, não representativo do uso normal). As duas
  queries que o dashboard roda de fato (`contacts` e `deals`, com os
  mesmos `select`/`order` de `src/app/dashboard/page.tsx`) responderam em
  **~250-290ms cada**, de forma consistente em 3 repetições, rodando em
  paralelo no carregamento real da página. Dados de teste apagados ao
  final (cascade via exclusão do usuário). Detalhes em
  `docs/relatorio-fase-2.md`.
  ⚠️ Isso mede a camada de banco/API, não o tempo de renderização de 500
  cards arrastáveis no navegador — não foi medido em um browser real.
  Se algum dia isso for um problema percebido de verdade, a saída é
  paginação/virtualização por coluna, não otimização prematura agora.

- [ ] **Confirmar que backup automático do Supabase está ativo.**
  ⚠️ Segue pendente — só verificável no painel do Supabase (Project
  Settings → Backups), não existe API disponível nesta sessão para checar
  programaticamente. **Ponto de atenção real:** o plano gratuito do
  Supabase historicamente **não inclui** backup diário automático nem
  PITR — isso costuma ser recurso do plano Pro. Precisa ser confirmado
  manualmente por quem tem acesso ao painel; se o Free plan não cobrir, a
  alternativa de baixo custo é um export manual periódico (`pg_dump` via
  connection string) até migrar de plano.

## Reforço específico desta fase: estágios centralizados

Estágio do funil, rótulo exibido e limiar de dias para lembrete vivem num
único módulo (`src/lib/pipeline.ts`), não espalhados em cada componente.
Isso não é item de segurança por si só, mas evita a categoria de bug mais
provável quando as entrevistas voltarem e um nome de estágio mudar: uma
string hardcoded esquecida em algum canto que não bate mais com o
`check` do banco.

## O que fica fora do escopo (de propósito)

- Editar contato depois de criado (só criação + anotação).
- Apagar anotação, apagar contato, apagar deal.
- Notificação por e-mail/push do lembrete (fica pra quando isso for
  decidido como prioridade real, possivelmente pós-entrevistas).
- Qualquer campo de contato além de nome/telefone/e-mail.

Se as entrevistas voltarem pedindo algo daqui, entra depois, com checklist
próprio — não expandir o escopo no meio da implementação.
