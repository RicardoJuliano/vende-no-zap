# Deploy na Vercel (Etapa 4)

## O que já está feito

- Projeto **vende-no-zap** criado na Vercel e linkado ao repositório
  `RicardoJuliano/vende-no-zap` (branch `main`) — todo push dispara deploy
  automático, sem passo manual.
- URL de produção: **https://vende-no-zap.vercel.app**
- Proteção "Vercel Authentication" (SSO), que vem ligada por padrão em
  projeto novo do time e barraria qualquer visitante com uma tela de login
  da Vercel, foi **desligada de propósito** — decisão tomada com o dono do
  projeto, já que o objetivo da Fase 0 é divulgar o link publicamente nos
  grupos.

## Pendente — só dá pra fazer pelo painel da Vercel

Nenhuma ferramenta disponível nesta sessão permite configurar env vars de
projeto Vercel remotamente. Até isso ser feito manualmente, **toda rota
retorna 500** (o proxy/middleware roda em toda request e derruba a página
ao tentar montar o cliente Supabase sem URL/chave).

1. [Project Settings → Environment Variables](https://vercel.com/ricardojulianos-projects/vende-no-zap/settings/environment-variables)
2. Adicionar em **Production**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Enquanto a Etapa 1 (`docs/fase-1-checklist-seguranca.md`) não estiver
     pronta, usar os mesmos placeholders do `.env.local`
     (`https://placeholder.supabase.co` / `placeholder`) só para o site
     parar de dar 500 — o formulário da landing não grava nada de verdade
     nesse estado, mas as páginas carregam.
   - Assim que o projeto Supabase real existir, trocar pelos valores
     definitivos (Project Settings → API no Supabase).
3. Depois de salvar as env vars: **Deployments** → `...` no deployment mais
   recente → **Redeploy** (ou só dar um novo `git push`).

## Depois disso

- Testar o cadastro da lista de espera em produção com um envio real.
- Preencher `WHATSAPP_NUMBER` (`src/lib/config.ts`) quando tiver o número
  comercial — o botão de contato direto aparece sozinho, sem precisar de
  novo deploy manual (a Vercel redeploya no próximo push).
