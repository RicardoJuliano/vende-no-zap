-- Vende no Zap — lista de espera (Fase 0)
--
-- Tabela pública de captação de leads da landing page. Ao contrário das
-- tabelas da Fase 1, aqui não existe "dono": qualquer visitante anônimo
-- pode INSERIR um registro (é o formulário da landing), mas ninguém além
-- do dono do projeto (via service_role, que ignora RLS) pode LER, alterar
-- ou apagar — não existe policy de select/update/delete para anon.
--
-- Coleta só o que o checklist da Fase 0 permite: nome, telefone e e-mail.
-- Nada de CPF ou dado sensível.

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  -- e-mail é opcional: o público-alvo (autônomos, lojas de bairro) vive
  -- no WhatsApp, nem sempre confere e-mail no dia a dia.
  email text,
  -- dedupe: normaliza o telefone (só dígitos) para achar reenvios do
  -- mesmo número sem travar em formatação diferente ((11) 9... vs 11 9...).
  phone_normalized text generated always as (regexp_replace(phone, '\D', '', 'g')) stored,
  created_at timestamptz not null default now()
);

create unique index waitlist_signups_phone_normalized_key
  on public.waitlist_signups (phone_normalized);

alter table public.waitlist_signups enable row level security;

create policy "waitlist: qualquer visitante pode entrar na lista"
  on public.waitlist_signups for insert
  to anon, authenticated
  with check (true);

grant insert on public.waitlist_signups to anon, authenticated;

-- Sem policy de select/update/delete: só a service_role key (painel do
-- Supabase, ou uma rota administrativa futura) consegue ler os leads.
