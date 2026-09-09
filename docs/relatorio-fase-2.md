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

### Reconfirmação final (sessão de preparação pra demo)

Rodado de novo, com um par novo de contas descartáveis, depois de todo o
trabalho das Entregas 2 e 3 abaixo — pra garantir que nada regrediu:

| Tentativa, autenticado como B | Resultado |
|---|---|
| Mover o card (deal) de A | `204` na chamada, mas o estágio de A **não mudou** (confirmado via `service_role`) |
| Criar anotação no contato de A | `403` |
| Apagar a anotação de A | `204` na chamada, mas a anotação **continua existindo** (confirmado via `service_role`) |
| Ler os deals de A (base dos lembretes) | `[]` — vazio, logo também não há como ler lembretes de outra conta |

Sem regressão. Contas de teste apagadas ao final.

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

Suíte completa em **44/44**:

- `pipeline.test.ts` — as 5 chaves de estágio batem com o `check` do banco.
- `reminders.test.ts` — cálculo de dias, quais estágios geram lembrete,
  singular/plural na mensagem.
- `pipeline.validations.test.ts` — os 3 schemas zod novos.
- `pipeline-board.test.tsx` — renderiza uma coluna por estágio (lidas de
  `DEAL_STAGES`, não hardcoded no teste), mostra card no lugar certo,
  botão de novo contato presente, estado vazio nas colunas sem card.
- `demo-dataset.test.ts` — o dataset da conta demo (Entrega 2, abaixo)
  tem os 15 contatos, cobre os 5 estágios, valores em centavos dentro da
  faixa realista, pelo menos 2 lembretes atrasados e é determinístico.
- `config.test.ts` — o link do WhatsApp (Entrega 3, abaixo) monta certo
  quando há número e retorna `null` quando não há.

Lint limpo, build de produção sem erros.

---

## 7. Entrega 2 — Conta de demonstração

`npm run seed:demo` ([`scripts/seed-demo.ts`](../scripts/seed-demo.ts))
popula uma conta fixa com dado realista, pronta pra abrir na frente de um
cliente sem depender de nada real ter sido cadastrado antes.

**Como funciona:**
1. Acha a conta demo por e-mail (via `profiles`, com a `service_role`
   key) ou cria (via Admin API) se ainda não existir.
2. Loga como a própria conta demo (senha normal, mesma API que a tela de
   login usa) — os inserts abaixo passam pelas mesmas policies de RLS que
   um usuário real enfrentaria, não um atalho de admin.
3. Apaga os contatos que já existirem na conta (cascade cuida de deals e
   anotações) e insere o dataset de
   [`src/lib/demo-dataset.ts`](../src/lib/demo-dataset.ts) do zero.

**Por que isso é idempotente:** rodar de novo não duplica porque cada
execução começa apagando o estado anterior da conta demo — sempre termina
no mesmo lugar, exatamente o que se quer antes de uma demonstração ao
vivo. Testado rodando duas vezes seguidas: 15 contatos, 15 deals, 10
anotações nas duas rodadas.

**Credenciais:** `DEMO_ACCOUNT_EMAIL` / `DEMO_ACCOUNT_PASSWORD` no
`.env.local` — nunca hardcoded no script nem commitado (documentado em
`.env.example`). Passo a passo de uso no [`README.md`](../README.md#conta-de-demonstração).

**Dataset:** 15 contatos com nomes comuns, telefones fictícios no formato
`(38) 9XXXX-XXXX`, distribuídos nos 5 estágios do funil (4 em "Novo lead",
3 em "Orçamento enviado", 3 em "Negociando", 3 em "Fechado", 2 em
"Perdido"), valores entre R$80 e R$1.500, anotações com frase de uso real
("Pediu orçamento de 2 bolos pra sábado", "Disse que ia pensar, cobrar
quinta"). Dois deals nascem com `updated_at` propositalmente atrasado
(`FOLLOWUP_THRESHOLD_DAYS + 1` e `+2` dias, não um número fixo — segue
automaticamente se o limiar mudar) pra aparecer como lembrete assim que a
conta é aberta.

**Verificação visual real:** logado como a conta demo via navegador
(Playwright headless, não só a API) depois de rodar a seed:

- As 5 colunas aparecem com a contagem certa: Novo lead (4), Orçamento
  enviado (3), Negociando (3), Fechado (3), Perdido (2) — bate exatamente
  com o dataset.
- A seção "Lembretes de follow-up" mostra as duas mensagens esperadas:
  *"Faz 3 dias que você mudou o card de Fernanda Rocha e ele não
  respondeu"* e *"Faz 4 dias que você mudou o card de Seu José (Padaria
  do José) e ele não respondeu"*, com os dois cards destacados em âmbar.
  Nenhum erro no console do navegador.
- No mobile (viewport 390px), as colunas rolam horizontalmente — a
  primeira tela mostra "Novo lead" completo, confirmando o comportamento
  mobile-first pretendido.

---

## 8. Entrega 3 — WhatsApp na landing

`WHATSAPP_NUMBER` deixou de ser uma constante vazia hardcoded em
`src/lib/config.ts` e passou a vir de variável de ambiente
(`process.env.WHATSAPP_NUMBER`) — trocar ou preencher o número pela
primeira vez agora é configuração, não código. Continua sem o prefixo
`NEXT_PUBLIC_`: só é lido no servidor (a landing é Server Component), não
precisa ir pro bundle do navegador.

Mensagem pré-preenchida ajustada para o texto pedido: *"Oi! Vi o Vende no
Zap e quero saber mais."*

`getWhatsAppLink()` ganhou um segundo parâmetro (`number`, com o valor do
ambiente como default) só pra dar pra testar as duas situações sem mockar
variável de ambiente: `config.test.ts` cobre número ausente (retorna
`null`), link montado certo com número presente, e que a mensagem vem
corretamente escapada na URL (um `&` ou `%` na mensagem não pode virar
parâmetro extra por acidente).

Nada além disso mudou — o botão continua invisível até `WHATSAPP_NUMBER`
ser preenchido, mesmo comportamento de antes.

---

## 9. Commits desta fase

| Commit | Resumo |
|---|---|
| `c93ae3b` | Checklist de segurança da Fase 2 (antes do primeiro commit de código) |
| `01ea6e1` | Funil kanban, contato rápido, anotações e lembretes |
| `68436a1` | Corrige brecha de autorização: contact_id de outro dono aceito |
| `f3da186` | Fecha checklist e relatório da Fase 2 |
| *(a seguir)* | Conta de demonstração (`npm run seed:demo`) + WhatsApp via env var |

---

## 10. O que fica pendente

- [ ] **Preencher `WHATSAPP_NUMBER`** quando tiver o número comercial —
  hoje vazio de propósito, o botão continua escondido até lá.
- [ ] **Confirmar backup automático do Supabase** — só verificável no
  painel, plano Free pode não incluir (ver checklist).
- [ ] **Usar o funil por uma semana com contatos reais** antes de mostrar a
  qualquer cliente (Etapa 6 do roteiro de execução) — a conta demo
  (Entrega 2) cobre a demonstração, não substitui isso.
- [ ] **Etapa 5 continua em paralelo** — as 10+ entrevistas de validação.
  O critério de negócio (5+ "eu pagaria" com valor concreto) segue
  valendo independente do código estar pronto ou da demo funcionar bem.

## 11. Pronto pra demonstração ao vivo

Este era o objetivo da sessão. Checklist de "está pronto pra abrir no
celular na frente de um cliente":

- [x] Funil, contatos, anotações e lembretes funcionando de ponta a ponta
- [x] Mobile-first — testado em viewport de celular (390px)
- [x] Conta de demonstração com dado realista, um comando (`npm run
      seed:demo`) pra resetar antes de cada demo
- [x] Isolamento entre contas testado e retestado, achado real corrigido
- [x] Botão de WhatsApp pronto pra ligar assim que o número existir
- [x] CI verde, 44 testes, lint e build sem erros
