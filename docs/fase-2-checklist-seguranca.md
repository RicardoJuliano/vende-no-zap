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

- [ ] **Validação de entrada no servidor em todos os formulários.**
  Zod, como já é padrão no projeto (`src/lib/validations/auth.ts`,
  `waitlist.ts`). Novos schemas: contato (nome/telefone obrigatórios,
  e-mail opcional), anotação (corpo não vazio, tamanho máximo), mudança de
  estágio (só um dos 5 valores válidos, vindos do único arquivo de
  configuração do funil — nunca uma string solta digitada de novo em cada
  lugar).

- [ ] **Proteção contra XSS: anotações e nomes de contato são texto de
  usuário.**
  React/JSX escapa por padrão qualquer texto interpolado em `{}` — não é
  preciso (e não deve) usar `dangerouslySetInnerHTML` em nenhum lugar que
  renderize nome de contato, anotação ou título de deal. Verificação: grep
  por `dangerouslySetInnerHTML` no diff da fase deve dar zero resultados.

- [ ] **Queries sempre parametrizadas via SDK do Supabase.**
  Todo acesso a dado passa pelo cliente JS do Supabase
  (`.from("tabela").select/insert/update()`), nunca por SQL montado por
  concatenação de string. As únicas queries SQL cruas do projeto vivem nas
  migrações (`supabase/migrations/*.sql`), que são texto fixo escrito por
  nós, não input de usuário.

- [ ] **Autorização em cada operação (mover card, editar contato, apagar
  anotação).**
  RLS já cobre isso no banco (nenhuma linha de outro `user_id` é
  visível/editável, ponto final) — mas cada server action também confirma
  a sessão (`supabase.auth.getUser()`) e inclui o `user_id` correto
  explicitamente no insert/update, em vez de confiar apenas no RLS
  silencioso. Duas camadas: uma que barra na aplicação com erro claro, uma
  que barra no banco mesmo se a primeira falhar.
  *(Apagar anotação não faz parte do escopo desta fase — só criar. Se
  vier a existir, segue a mesma regra.)*

- [ ] **Teste de carga leve: 500 contatos numa conta, funil continua
  fluido.**
  Rodado contra o projeto Supabase real ao final da fase (não é
  hipotético): insere 500 contatos + deals de teste numa conta descartável,
  mede o tempo da query que o dashboard usa, depois apaga tudo. Resultado
  registrado em `docs/relatorio-fase-2.md`.

- [ ] **Confirmar que backup automático do Supabase está ativo.**
  ⚠️ Só verificável no painel do Supabase (Project Settings → Backups),
  não existe API disponível nesta sessão para checar programaticamente.
  **Ponto de atenção real:** o plano gratuito do Supabase historicamente
  **não inclui** backup diário automático nem PITR — isso costuma ser
  recurso do plano Pro. Precisa ser confirmado manualmente por quem tem
  acesso ao painel; se o Free plan não cobrir, a alternativa de baixo custo
  é um export manual periódico (`pg_dump` via connection string) até migrar
  de plano.

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
