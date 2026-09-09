# Vende no Zap — Relatório da Fase 2 (CRM básico)

**Data:** 09/09/2026
**Status:** Código completo, testado e verificado contra o banco real.
Liberada em **modo paralelo** com a Etapa 5 (entrevistas de validação
rodando ao mesmo tempo) — escopo é o mínimo do plano, nada além disso.

Este documento cobre só a Fase 2. Para arquitetura geral, autenticação e
Fase 0/1, ver [`relatorio-completo.md`](./relatorio-completo.md).

---

## 1. O que foi construído

| Item do plano | Onde |
|---|---|
| Funil kanban, 5 colunas, cards arrastáveis | `src/app/dashboard/pipeline-board.tsx`, `deal-card.tsx` |
| Cadastro rápido de contato (nome + telefone) | `src/app/dashboard/quick-add-contact.tsx` |
| Anotações por contato com data automática | `src/app/dashboard/contact-notes-panel.tsx` |
| Lembretes de follow-up (badge + lista, sem e-mail/push) | Badge no card + seção no topo do `pipeline-board.tsx` |
| Mobile-first | Colunas roláveis horizontalmente com scroll-snap, alvos de toque grandes |

Nada além disso entrou — sem editar contato, sem apagar anotação/deal, sem
notificação por e-mail/push. Ver
[`docs/fase-2-checklist-seguranca.md`](./fase-2-checklist-seguranca.md) pra
lista completa do que ficou de fora de propósito.

---

## 2. Como o funil funciona por dentro

### Estágios centralizados, não espalhados

`src/lib/pipeline.ts` é a única fonte de verdade: nome de estágio, rótulo
exibido, ordem das colunas e limiar de dias pro lembrete vivem todos ali.
Motivo direto: a Fase 2 está sendo construída **enquanto as entrevistas da
Etapa 5 ainda rodam** — se voltarem pedindo pra renomear "Orçamento
enviado" pra "Proposta enviada", ou mudar o limiar de 2 para 3 dias, é uma
mudança de uma linha nesse arquivo, não uma caça a string por 6 componentes
diferentes. Um teste (`src/lib/__tests__/pipeline.test.ts`) trava a lista
de chaves para bater exatamente com o `check` da coluna `stage` no banco —
se alguém editar uma sem editar a outra, o teste quebra.

### Persistência do drag-and-drop

Card arrastado (via [`@dnd-kit`](https://dndkit.com)) atualiza o estado
local **na hora** (otimista) e dispara `updateDealStageAction` em segundo
plano. Se a action falhar (sessão caiu, erro de rede), o estado volta pro
que era antes e um aviso aparece — o usuário nunca vê um card "grudado" num
lugar que não foi realmente salvo.

Cada card também tem um `<select>` com os 5 estágios, funcionando
independente do arrastar — pega o clique antes que o listener de drag do
card inteiro reaja (`stopPropagation` no `pointerDown`). Existe por dois
motivos: acessibilidade (funciona por teclado) e robustez (arrastar em
tela de toque dentro de uma coluna que também rola horizontalmente é
historicamente a parte mais frágil de qualquer kanban mobile — o select
garante que mover um card sempre funciona, mesmo se o gesto de arrastar
falhar num aparelho específico).

### Cadastro rápido = contato + deal juntos

Criar um contato pelo botão "+ Novo contato" já cria, na mesma ação, um
`deal` em `novo_lead` vinculado a ele — é isso que faz o contato aparecer
no funil imediatamente. Não existe conceito de "contato sem deal" na UI
desta fase.

### Anotações: histórico imutável, carregado sob demanda

`contact_notes` é tabela própria (não reaproveita o campo `contacts.notes`
da Fase 1, que é um texto único sobrescrevível). RLS permite `select` e
`insert`, mas nenhuma policy de `update`/`delete` — uma anotação salva não
é editável nem apagável por ninguém, nem o próprio dono, por design: é
registro histórico de quando algo foi dito/feito.

As anotações de um contato só são buscadas quando o card é aberto
(`getContactNotesAction`), não todas de uma vez no carregamento do
dashboard — evita carregar dado que a maioria das visitas à página não vai
usar.

### Lembretes sem coluna nova

"Faz X dias que você mudou o card do fulano e ele não respondeu" usa
`deals.updated_at` como proxy de "tempo neste estágio" — não foi criada
uma coluna ou tabela de histórico de estágio só pra isso. Funciona porque
`updated_at` só muda quando o deal em si muda (a trigger já existente da
Fase 1), e mover de estágio é a única edição que a Fase 2 faz num deal.
Só conta para `orcamento_enviado` e `negociando` (`FOLLOWUP_STAGES` em
`pipeline.ts`) — estágios finais (`fechado`, `perdido`) nunca geram aviso.

---

## 3. Achado de segurança real: contact_id de outro dono

Rodando o teste de isolamento entre contas (o mesmo roteiro da Fase 1,
estendido pras operações novas do funil), apareceu um problema que **não
foi introduzido pela Fase 2** — estava desde a `0001_init.sql`:

**O que acontecia:** as policies de `deals` e `conversations` (e a nova
`contact_notes`) só conferiam `auth.uid() = user_id` no `with check`.
Nunca verificavam se o `contact_id` sendo referenciado pertencia a esse
mesmo usuário. Na prática, um usuário B autenticado, sabendo (ou
adivinhando) o UUID de um contato de outra conta, conseguia:

```
POST /rest/v1/deals
{ "user_id": "<B>", "contact_id": "<contato de A>", "title": "...", "stage": "novo_lead" }
→ HTTP 201 (deveria ter sido bloqueado)
```

**Por que o teste de isolamento da Fase 1 não pegou isso:** aquele roteiro
testava "B consegue *mexer num recurso existente de A*?" (ler, editar,
apagar por id). Nunca testou "B consegue *criar um recurso novo
referenciando* algo de A?" — uma categoria de ataque diferente
(escrita indevida via referência cruzada, não leitura indevida).

**Impacto real:** não vaza dado de A para B — o `select` de A continua
filtrado por `user_id = A`, então o registro malicioso de B nunca aparece
na visão de A. O risco é escrita/poluição indevida: lixo anexado a um
recurso alheio sem autorização nenhuma para isso, e uma porta aberta para
abuso se um `contact_id` de outra conta algum dia vazar por outro canal
(URL, log, mensagem de erro).

**Correção:** [`0004_fix_cross_owner_contact_id.sql`](../supabase/migrations/0004_fix_cross_owner_contact_id.sql)
adiciona `public.user_owns_contact(contact_id)` e reforça o `with check`
de `deals`, `conversations` e `contact_notes` para também exigir isso.
Reteste confirmou: as duas tentativas agora voltam `403`, e o fluxo
legítimo (criar/mover deal e anotação no próprio contato) continua
funcionando sem mudança de comportamento.

**Lição que já estava escrita no projeto e se confirmou de novo:** "RLS
escrito não é RLS testado" (`docs/fase-1-checklist-seguranca.md`) —
inclusive um RLS já testado uma vez pode ter uma categoria de falha que o
primeiro teste não cobria.

---

## 4. Prova de isolamento entre contas (retestado após a correção)

Rodado contra o projeto Supabase de produção, dois usuários de teste
descartáveis, apagados ao final:

| Tentativa, autenticado como B | Resultado |
|---|---|
| Ler contatos de A | `[]` — vazio |
| Mover deal de A pra "fechado" | Sem efeito — estágio de A continuou o que era |
| Apagar contato de A | Sem efeito — contato de A continuou existindo |
| Ler `waitlist_signups` autenticado | `[]` — vazio |
| **Criar deal apontando pro contato de A** (achado novo) | **`403`** — bloqueado após a correção |
| **Criar anotação apontando pro contato de A** (achado novo) | **`403`** — bloqueado após a correção |

E confirmando que nada quebrou para o dono real:

| Ação de A no próprio contato | Resultado |
|---|---|
| Criar deal | `201` — funciona |
| Criar anotação | `201` — funciona |
| Mover o próprio deal de estágio | Aplicado — estágio mudou de verdade |

---

## 5. Teste de carga (500 contatos)

Conta de teste descartável, apagada ao final:

| Operação | Tempo |
|---|---|
| Inserir 500 contatos (1 request em lote) | ~900ms |
| Inserir 500 deals (1 request em lote) | ~450ms |
| Query de contatos do dashboard (`select id,name,phone order by created_at desc`) | ~250-270ms, 3 repetições |
| Query de deals do dashboard (`select id,title,stage,value_cents,contact_id,updated_at order by updated_at desc`) | ~270-290ms, 3 repetições |

As duas queries do dashboard rodam em paralelo (`Promise.all` em
`src/app/dashboard/page.tsx`), então o tempo real de carregamento da
página com 500 contatos fica perto do maior dos dois — **~290ms** — mais
o tempo normal de renderização do React.

⚠️ **O que isso não mede:** o tempo de renderizar 500 cards arrastáveis
(cada um com um listener de `@dnd-kit` e um `<select>`) num navegador de
verdade. Não foi perfilado em browser. Se isso um dia se mostrar lento na
prática, a resposta é paginação ou virtualização por coluna — não vale a
pena otimizar agora sem sinal real de que é um problema.

---

## 6. Testes automatizados

21 testes novos, suíte completa em **35/35**:

- `pipeline.test.ts` — as 5 chaves de estágio batem com o `check` do banco.
- `reminders.test.ts` — cálculo de dias, quais estágios geram lembrete,
  singular/plural na mensagem.
- `pipeline.validations.test.ts` — os 3 schemas zod novos.
- `pipeline-board.test.tsx` — renderiza uma coluna por estágio (lidas de
  `DEAL_STAGES`, não hardcoded no teste), mostra card no lugar certo,
  botão de novo contato presente, estado vazio nas colunas sem card.

Lint limpo, build de produção sem erros.

---

## 7. Commits desta fase

| Commit | Resumo |
|---|---|
| `c93ae3b` | Checklist de segurança da Fase 2 (antes do primeiro commit de código) |
| `01ea6e1` | Funil kanban, contato rápido, anotações e lembretes |
| `68436a1` | Corrige brecha de autorização: contact_id de outro dono aceito |

---

## 8. O que fica pendente

- [ ] **Confirmar backup automático do Supabase** — só verificável no
  painel, plano Free pode não incluir (ver checklist).
- [ ] **Usar o funil por uma semana com contatos reais** antes de mostrar a
  qualquer cliente (Etapa 6 do roteiro de execução).
- [ ] **Etapa 5 continua em paralelo** — as 10+ entrevistas de validação.
  O critério de negócio (5+ "eu pagaria" com valor concreto) segue
  valendo independente do código estar pronto.
