# Fase 0 — Checklist de segurança e testes

Status de cada item do [plano](../plano-vende-no-zap.md) para a Fase 0.

- [x] **A landing page só coleta nome, telefone e e-mail. Nada de CPF ou
  dados sensíveis.**
  Formulário em `src/app/waitlist-form.tsx` só tem esses três campos (e-mail
  opcional). O schema de validação
  ([`src/lib/validations/waitlist.ts`](../src/lib/validations/waitlist.ts))
  rejeita qualquer payload com campos além desses — não existe caminho no
  código para gravar outra coisa.

- [x] **Aviso de privacidade e finalidade da coleta.**
  Texto fixo abaixo do botão de envio: "Usamos seu nome, telefone e e-mail
  só para avisar do lançamento e entender se o Vende no Zap resolve sua dor.
  Sem spam, sem repasse a terceiros." Uma Política de Privacidade formal
  (documento completo) fica pra Fase 5 — nesta fase o aviso inline já cobre
  a exigência de transparência sobre finalidade da LGPD.

## O que foi implementado além do checklist original

O plano previa uma landing page solta, sem back-end ("sem código"). Como a
Fase 1 (fundação técnica) já estava pronta quando a Fase 0 foi retomada,
optei por encaixar a lista de espera dentro do mesmo projeto Next.js +
Supabase em vez de duas stacks separadas:

- Tabela `public.waitlist_signups` — ver
  [`supabase/migrations/0002_waitlist.sql`](../supabase/migrations/0002_waitlist.sql).
  RLS ativado: qualquer visitante anônimo pode **inserir** um registro (é o
  formulário), mas ninguém consegue **ler, alterar ou apagar** pela API —
  só a `service_role` key (uso interno, painel do Supabase) enxerga os
  leads. Isso equivale, na prática, a uma "caixa de correio": qualquer um
  deposita uma carta, só o dono tem a chave da caixa.
- Deduplicação por telefone (`phone_normalized`, índice único): a mesma
  pessoa preenchendo o formulário duas vezes não vira dois leads.
- Honeypot anti-spam (campo `website`, escondido via CSS): reduz
  cadastro automatizado por bot sem exigir captcha.
- **Rate limit por IP** ([`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts)):
  no máximo 5 envios por hora por IP. Usa Upstash Redis quando
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` estão configurados
  (funciona certo com várias instâncias serverless na Vercel); sem essas
  variáveis, cai num fallback em memória — protege só uma instância por
  vez, aceitável em dev local e enquanto o tráfego é baixo, mas configure
  o Upstash antes de divulgar a landing em escala.
- **Resposta uniforme no dedupe**: telefone novo, telefone repetido e
  honeypot de bot devolvem exatamente a mesma mensagem de sucesso. Antes,
  telefone repetido tinha um texto diferente — dava pra usar o formulário
  para descobrir se um número específico já estava cadastrado (enumeração
  de dados de terceiro). Corrigido em
  [`src/app/actions/waitlist.ts`](../src/app/actions/waitlist.ts).
- Botão de contato direto no WhatsApp só aparece quando
  `WHATSAPP_NUMBER` (em [`src/lib/config.ts`](../src/lib/config.ts)) for
  preenchido — está em branco de propósito por enquanto.

## Pendente (exige ação sua)

- [ ] **Aplicar a migração `0002_waitlist.sql`** no projeto Supabase (mesmo
  passo do README: colar no SQL Editor).
- [ ] **Preencher `WHATSAPP_NUMBER`** em `src/lib/config.ts` quando tiver o
  número comercial definido.
- [ ] **Rodar as 10+ conversas reais** com donos de negócio — ver
  [`fase-0-roteiro-entrevistas.md`](./fase-0-roteiro-entrevistas.md). Nenhum
  código substitui isso: é o critério real de avanço da fase.
