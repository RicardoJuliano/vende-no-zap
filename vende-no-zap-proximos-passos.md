# Vende no Zap — Como prosseguir

Situação em 09/09/2026: Fase 1 com código pronto, Fase 0 com landing pronta mas validação humana pendente. Este guia lista o que fazer, em ordem, e o critério para cada decisão.

**Regra que vale para tudo abaixo:** o código está na frente da validação. Nada de Fase 2 até as entrevistas confirmarem que existe cliente pagante.

---

## Etapa 1 — Ativar o Supabase (você · ~30 min)

1. Criar o projeto em supabase.com (plano gratuito serve).
2. Abrir o SQL Editor e rodar, nesta ordem:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_waitlist.sql`
3. Copiar URL e anon key do painel para o `.env.local` (o README do repo tem o passo a passo).
4. Subir o projeto local (`npm run dev`) e confirmar que cadastro e login funcionam.

**Pronto quando:** você cria uma conta, faz login e cai no dashboard.

---

## Etapa 2 — Teste de isolamento entre contas (você · ~30 min)

Este é o item mais importante pendente da Fase 1. RLS escrito não é RLS testado.

1. Criar duas contas (conta A e conta B).
2. Logado na conta A, criar um contato e um deal.
3. Logado na conta B, tentar via API (o roteiro em `docs/fase-1-checklist-seguranca.md` mostra como):
   - Ler os contatos da conta A → tem que voltar vazio ou erro.
   - Editar o deal da conta A pelo id → tem que falhar.
   - Apagar o contato da conta A pelo id → tem que falhar.
4. Repetir o teste na tabela `waitlist_signups`: usuário logado comum não pode conseguir ler a lista.

**Pronto quando:** as 4 tentativas falham. Só então a Fase 1 está concluída de verdade. Se qualquer uma passar, parar tudo e corrigir a política de RLS antes de continuar.

---

## Etapa 3 — Ajustes na waitlist (delegar ao Claude Code · ~1 sessão)

Dois buracos identificados na análise do relatório:

1. **Rate limit na server action da lista de espera.** O honeypot não segura script insistente. Limitar por IP (ex.: 5 cadastros por hora) e devolver erro genérico ao passar do limite.
2. **Resposta uniforme no dedupe.** Hoje, se a resposta muda quando o telefone já existe, qualquer pessoa consegue testar se um número está na base. O formulário deve responder exatamente igual nos dois casos: "pronto, você está na lista".

**Pronto quando:** os dois ajustes têm teste automatizado cobrindo e o CI passa.

---

## Etapa 4 — Deploy na Vercel (delegar ao Claude Code · ~1 sessão)

1. Conectar o repositório à Vercel e configurar as variáveis de ambiente no painel (nunca no código).
2. Confirmar HTTPS e domínio (o subdomínio `.vercel.app` serve para começar; domínio próprio pode esperar).
3. Testar o formulário da waitlist em produção com um cadastro real.
4. Preencher `WHATSAPP_NUMBER` quando tiver o número comercial — se ainda não tiver, deixar para depois, o botão continua escondido.

**Pronto quando:** o link abre no celular, o formulário grava no Supabase e nada de segredo aparece no repositório.

---

## Etapa 5 — Validação (só você · 2 a 3 semanas)

A parte que nenhuma automação faz. Material já pronto no repo:

- Roteiro de entrevista: `docs/fase-0-roteiro-entrevistas.md`
- Planilha de acompanhamento: `docs/fase-0-prospects-template.csv`

Plano de execução:

1. Listar 15–20 negócios que vendem pelo WhatsApp (carteira PJ, comércio local, contatos da cidade).
2. Agendar e rodar no mínimo 10 conversas. Presencial ou chamada, não formulário.
3. Registrar cada conversa na planilha logo depois, com as respostas às perguntas-chave:
   - Como acompanha hoje um orçamento que o cliente não respondeu?
   - Já perdeu venda por esquecer de responder?
   - Quanto pagaria para isso não acontecer mais?
4. Divulgar o link da landing nos grupos locais e fechar cada conversa oferecendo o cadastro na lista.

**Critério de decisão (combinado por escrito com você mesmo):**

- **5+ pessoas dizendo "eu pagaria" com valor concreto** → Fase 2 liberada.
- **Menos que isso** → não é sinal de acelerar, é sinal de rever a dor ou o público. O projeto para na Fase 1 e vira portfólio, o que já tem valor. Código bom não é motivo para insistir num produto sem comprador.

---

## Etapa 6 — Fase 2, quando (e se) liberada

Escopo já definido no plano (`plano-vende-no-zap.md`): funil kanban, cadastro rápido de contato, anotações com data, lembretes de follow-up, mobile-first. Antes de pedir a construção:

1. Reler as anotações das entrevistas e ajustar o escopo: se os 10 entrevistados pediram a mesma coisa e ela não está no MVP, entra; o que ninguém mencionou, sai.
2. Definir com o Claude Code o checklist de segurança da fase antes do primeiro commit (validação server-side, XSS nas anotações, autorização por recurso).
3. Você mesmo usar o funil por uma semana com contatos reais antes de mostrar a qualquer cliente.

---

## Paralelo: portfólio e busca de vaga

Cada etapa fechada vira material sem esforço extra:

- Etapa 2 fechada → post no LinkedIn sobre testar RLS de verdade (tema que júnior quase nunca domina).
- Etapa 4 fechada → link público no GitHub e no currículo.
- Etapa 5 fechada → história de validação com clientes reais, ouro em entrevista para vaga de produto/frontend.

---

## Resumo da ordem

| # | Etapa | Quem | Bloqueia |
|---|-------|------|----------|
| 1 | Ativar Supabase + migrações | Você | Tudo |
| 2 | Teste de isolamento entre contas | Você | Fase 2 |
| 3 | Rate limit + resposta uniforme na waitlist | Claude Code | Deploy |
| 4 | Deploy na Vercel | Claude Code | Divulgação |
| 5 | 10+ entrevistas de validação | Você | Fase 2 |
| 6 | Fase 2 (funil kanban) | Claude Code | — |

As etapas 1 e 2 destravam o resto e cabem numa noite. As entrevistas são o caminho crítico: comece a agendar já, mesmo antes do deploy.
