# Vende no Zap — Plano de Construção

CRM leve para quem vende pelo WhatsApp, com cobrança Pix embutida. Feito para autônomos, lojas de bairro, salões, clínicas e prestadores de serviço que nunca usaram CRM.

**Modelo de negócio:** assinatura mensal (R$ 97 a R$ 197 por conta), custo de infra quase zero por cliente.

**Regra do plano:** cada fase termina com um checklist de segurança e testes. Só se avança para a próxima fase quando o checklist da atual estiver fechado. Isso evita acumular dívida técnica e falha de segurança que fica cara de corrigir depois.

---

## Fase 0 — Validação (sem código)

Duração sugerida: 2 a 3 semanas.

### Objetivo
Confirmar que a dor existe e que as pessoas pagariam, antes de escrever uma linha de código.

### Tarefas
1. Listar 15 a 20 negócios conhecidos que vendem pelo WhatsApp (aproveitar a carteira PJ e contatos locais).
2. Conversar com pelo menos 10. Perguntas-chave:
   - Como você acompanha hoje um orçamento que enviou e o cliente não respondeu?
   - Já perdeu venda por esquecer de responder alguém?
   - Quanto pagaria para nunca mais perder um lead no WhatsApp?
3. Montar uma landing page simples (uma tela, formulário de lista de espera) e divulgar nos grupos locais.
4. Definir o MVP com base nas respostas: quais 3 funcionalidades resolvem 80% da dor.

### Critério para avançar
- Pelo menos 5 pessoas dizendo "eu pagaria por isso" com valor concreto na mesa.
- Escopo do MVP fechado por escrito (o que entra e, principalmente, o que NÃO entra).

### Segurança nesta fase
- A landing page só coleta nome, telefone e e-mail. Nada de CPF ou dados sensíveis.
- Já incluir aviso de privacidade e finalidade da coleta (LGPD começa aqui, não no produto pronto).

---

## Fase 1 — Fundação técnica

Duração sugerida: 2 semanas.

### Objetivo
Estrutura do projeto, banco, autenticação e ambiente de deploy funcionando de ponta a ponta com uma tela de login.

### Stack sugerida
| Camada | Escolha | Motivo |
|---|---|---|
| Frontend | Next.js + Tailwind | Você já domina React; SSR ajuda no SEO da landing |
| Backend | Next.js API routes ou NestJS | Um repositório só no começo simplifica |
| Banco | PostgreSQL (Supabase ou Neon) | Relacional, plano gratuito, backup fácil |
| Auth | Supabase Auth ou Auth.js | Não implementar autenticação na mão |
| Deploy | Vercel + banco gerenciado | Zero servidor para administrar |
| Pagamento | Stripe ou Asaas (Pix nativo) | Asaas resolve Pix e boleto no Brasil |

### Tarefas
1. Repositório com CI simples (lint + testes rodando em cada push).
2. Modelagem inicial do banco:
   - `users` (donos de conta)
   - `contacts` (leads/clientes do usuário)
   - `conversations` (vínculo com o WhatsApp)
   - `deals` (orçamento/venda em andamento, com estágio do funil)
   - `subscriptions` (plano e status de pagamento do usuário)
3. Autenticação com e-mail/senha + login social (Google).
4. Multi-tenancy desde o dia 1: toda tabela de dados do cliente tem `user_id` e toda query filtra por ele. Errar isso agora significa reescrever tudo depois.

### Checklist de segurança — Fase 1
- [ ] Senhas nunca armazenadas em texto puro (o provedor de auth já resolve, mas confirmar).
- [ ] Row Level Security (RLS) ativado no Postgres: usuário A jamais enxerga dados do usuário B, mesmo com bug na aplicação.
- [ ] Variáveis de ambiente fora do repositório (`.env` no `.gitignore`, secrets no painel da Vercel).
- [ ] HTTPS obrigatório em todos os ambientes.
- [ ] Rate limit no endpoint de login (bloquear força bruta).
- [ ] Teste manual: criar dois usuários e tentar acessar dados de um logado como o outro, direto pela API. Tem que falhar.

---

## Fase 2 — CRM básico (o coração do produto)

Duração sugerida: 3 a 4 semanas.

### Objetivo
Funil visual funcionando: cadastrar contato, mover pelo funil, registrar anotações, receber lembrete de follow-up.

### Tarefas
1. Tela de funil (kanban): colunas tipo "Novo lead → Orçamento enviado → Negociando → Fechado → Perdido".
2. Cadastro rápido de contato (nome + telefone, o resto é opcional).
3. Anotações por contato com data automática.
4. Lembretes: "faz 2 dias que você enviou orçamento pro João e ele não respondeu".
5. Notificação por e-mail e/ou push (web push é gratuito).
6. Design mobile-first. O usuário vai usar isso no celular, entre um atendimento e outro.

### Critério para avançar
- Você mesmo usando o sistema por uma semana para gerenciar contatos reais (nem que sejam os da busca por vagas).
- 2 ou 3 pessoas da Fase 0 testando de graça e dando feedback.

### Checklist de segurança e bugs — Fase 2
- [ ] Validação de entrada em todos os formulários no backend, não só no front (telefone, e-mail, tamanho de campos).
- [ ] Proteção contra XSS: anotações e nomes de contato são texto do usuário; escapar tudo na renderização.
- [ ] Proteção contra SQL injection (ORM com queries parametrizadas; nunca concatenar string em query).
- [ ] Autorização em cada endpoint: mover card, editar contato e apagar anotação verificam se o recurso pertence ao usuário logado.
- [ ] Teste de carga leve: 500 contatos numa conta, o funil continua rápido?
- [ ] Backup automático do banco configurado e restauração testada uma vez.

---

## Fase 3 — Integração com WhatsApp

Duração sugerida: 3 a 4 semanas. É a fase mais delicada.

### Objetivo
Conversas do WhatsApp aparecendo dentro do CRM, com criação automática de contato quando chega mensagem nova.

### Decisão de arquitetura
Duas rotas possíveis:

**Rota A — API oficial (WhatsApp Business API via Meta/BSP como Twilio, 360dialog ou Gupshup)**
- Prós: estável, sem risco de banimento, permitida comercialmente.
- Contras: custo por conversa, exige aprovação da Meta, número precisa ser dedicado.

**Rota B — Biblioteca não oficial (Baileys, whatsapp-web.js)**
- Prós: gratuita, rápida de prototipar.
- Contras: viola os termos do WhatsApp, risco real de banimento do número do cliente, instável.

**Recomendação:** prototipar internamente com a Rota B para aprender o fluxo, mas lançar comercialmente só com a Rota A. Cliente pagante com número banido destrói a reputação do produto na cidade em uma semana.

### Tarefas
1. Webhook recebendo mensagens e criando/atualizando contatos.
2. Vincular conversa ao card do funil.
3. Envio de mensagem a partir do CRM (respeitando as regras de janela de 24h da API oficial).
4. Templates de mensagem aprovados pela Meta (follow-up, cobrança, agradecimento).

### Checklist de segurança — Fase 3
- [ ] Validar assinatura dos webhooks (a Meta assina as requisições; rejeitar qualquer chamada sem assinatura válida).
- [ ] Tokens da API do WhatsApp guardados criptografados no banco, nunca no front.
- [ ] Conteúdo de mensagens criptografado em repouso no banco (é dado de conversa privada de terceiros).
- [ ] Definir política de retenção: por quanto tempo as mensagens ficam guardadas? Documentar.
- [ ] Endpoint de webhook com rate limit e fila (uma rajada de mensagens não pode derrubar o sistema).
- [ ] Teste: enviar payload malformado ao webhook e confirmar que o sistema rejeita sem quebrar.

---

## Fase 4 — Cobrança Pix embutida

Duração sugerida: 2 a 3 semanas.

### Objetivo
O usuário gera uma cobrança Pix de dentro do card e envia pelo WhatsApp em dois toques. Quando o cliente paga, o card atualiza sozinho.

### Tarefas
1. Integração com Asaas (ou Mercado Pago) para gerar cobranças Pix em nome do usuário.
2. Botão "Gerar cobrança" no card do deal: valor + descrição → link/QR code.
3. Webhook de confirmação de pagamento → card move para "Pago" e o usuário recebe notificação.
4. Histórico de cobranças por contato.

### Ponto de atenção
Você não vai tocar no dinheiro. O modelo é o cliente conectar a conta dele no gateway (subconta Asaas, por exemplo). Intermediar pagamento diretamente exige licença e traz responsabilidade regulatória que não vale a pena agora.

### Checklist de segurança — Fase 4
- [ ] Validar assinatura de todos os webhooks de pagamento (evitar "pagamento fantasma" forjado por requisição falsa).
- [ ] Idempotência nos webhooks: o mesmo evento processado duas vezes não pode duplicar registro de pagamento.
- [ ] Valores monetários em inteiro (centavos), nunca float.
- [ ] Nenhuma credencial de gateway exposta no front.
- [ ] Log de auditoria: toda cobrança criada, alterada ou paga fica registrada com quem fez e quando.
- [ ] Teste: tentar reenviar manualmente um webhook antigo de pagamento e confirmar que nada duplica.

---

## Fase 5 — Assinatura, LGPD e lançamento

Duração sugerida: 2 semanas.

### Objetivo
Produto cobrando dos assinantes, juridicamente coberto e no ar para os primeiros clientes pagantes.

### Tarefas
1. Planos e paywall: trial de 7 ou 14 dias, depois assinatura via gateway.
2. Bloqueio suave ao fim do trial (dados preservados, acesso limitado).
3. Termos de uso e Política de Privacidade (existem modelos bons de base; revisar com atenção ao seu caso).
4. Adequação LGPD:
   - Exportação dos próprios dados pelo usuário.
   - Exclusão de conta com apagamento real (ou anonimização) em prazo definido.
   - Registro das bases legais de tratamento.
5. Onboarding guiado: o usuário precisa chegar ao primeiro valor (primeiro lead no funil) em menos de 5 minutos.
6. Lançamento para a lista de espera da Fase 0, com preço fundador.

### Checklist de segurança — Fase 5
- [ ] Fluxo de exclusão de conta testado de ponta a ponta (dados somem mesmo?).
- [ ] Página de status ou canal de aviso para quando algo cair.
- [ ] Monitoramento de erros (Sentry tem plano gratuito) e alertas configurados.
- [ ] Revisão geral de dependências (`npm audit`) e atualização das críticas.
- [ ] Pentest caseiro: passar o OWASP Top 10 item a item contra o próprio sistema.
- [ ] Plano de resposta a incidente escrito em uma página: se vazar dado, quem faz o quê e em quanto tempo (a LGPD exige comunicação de incidentes).

---

## Fase 6 — Pós-lançamento (contínuo)

### Rotina
- Falar com todo cliente que cancelar. O motivo do churn vale mais que qualquer métrica.
- Medir 3 números: assinantes ativos, churn mensal, % de usuários que criaram pelo menos 1 cobrança Pix.
- Uma melhoria de produto por semana, vinda de pedido real de cliente.

### Segurança contínua
- `npm audit` e atualização de dependências a cada 2 semanas.
- Revisão trimestral dos acessos e chaves de API (rotacionar o que não é usado).
- Teste de restauração de backup a cada 3 meses.
- Reavaliar logs: guardar o necessário, apagar o que passou da retenção.

---

## Resumo do cronograma

| Fase | Entrega | Duração |
|---|---|---|
| 0 | Validação com clientes reais | 2–3 semanas |
| 1 | Fundação + auth + multi-tenancy | 2 semanas |
| 2 | CRM funil completo | 3–4 semanas |
| 3 | WhatsApp integrado | 3–4 semanas |
| 4 | Cobrança Pix | 2–3 semanas |
| 5 | Assinatura + LGPD + lançamento | 2 semanas |

Total: cerca de 4 meses trabalhando nas horas livres, com produto cobrando no fim. Cada fase fechada também vira material de portfólio e post no LinkedIn, o que alimenta a busca pela vaga de dev em paralelo.
