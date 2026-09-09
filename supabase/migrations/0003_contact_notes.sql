-- Vende no Zap — anotações por contato (Fase 2)
--
-- `contacts.notes` (0001_init.sql) é um campo único de texto livre — não
-- serve para "anotações com data automática" (plural, cada uma com seu
-- timestamp). Esta tabela guarda o histórico de anotações, uma linha por
-- anotação, cada uma imutável (sem policy de update/delete: uma anotação
-- registrada não deveria ser reescrita depois, é um registro de quando
-- algo foi dito/feito).

create table public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index contact_notes_user_id_idx on public.contact_notes (user_id);
create index contact_notes_contact_id_idx on public.contact_notes (contact_id);

alter table public.contact_notes enable row level security;

-- Só select e insert: nenhuma policy de update/delete pra ninguém (nem o
-- próprio dono) — anotação é um registro histórico, não um campo editável.
create policy "contact_notes: dono lê as próprias anotações"
  on public.contact_notes for select
  using (auth.uid() = user_id);

create policy "contact_notes: dono cria anotação"
  on public.contact_notes for insert
  with check (auth.uid() = user_id);
