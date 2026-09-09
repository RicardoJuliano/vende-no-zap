-- Vende no Zap — schema inicial (Fase 1)
--
-- Multi-tenancy por Row Level Security: toda tabela de dados do cliente
-- tem user_id e uma política que só libera linhas onde
-- auth.uid() = user_id. Isso vale mesmo que a aplicação tenha um bug e
-- esqueça de filtrar por usuário numa query — o Postgres barra na borda.
--
-- Aplique este arquivo no SQL Editor do seu projeto Supabase, ou via
-- `supabase db push` se estiver usando a Supabase CLI.

-- ─────────────────────────────────────────────────────────────────────────
-- Extensão para gerar UUIDs (gen_random_uuid)
-- ─────────────────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- Função utilitária: mantém updated_at em dia em qualquer UPDATE
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- profiles — um por usuário autenticado (dono da conta)
-- ─────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: dono lê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: dono atualiza o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria profile + assinatura em trial automaticamente quando alguém se
-- cadastra (Supabase Auth insere em auth.users; este trigger espelha
-- os dados básicos para public.profiles, que é o que a aplicação lê).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );

  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, 'trial', 'trialing', now() + interval '14 days');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- contacts — leads/clientes do usuário
-- ─────────────────────────────────────────────────────────────────────────
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_user_id_idx on public.contacts (user_id);

alter table public.contacts enable row level security;

create policy "contacts: isolado por dono"
  on public.contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- conversations — vínculo com o WhatsApp (populado na Fase 3)
-- ─────────────────────────────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  channel text not null default 'whatsapp',
  external_id text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_id_idx on public.conversations (user_id);
create index conversations_contact_id_idx on public.conversations (contact_id);

alter table public.conversations enable row level security;

create policy "conversations: isolado por dono"
  on public.conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- deals — orçamento/venda em andamento, com estágio do funil
-- ─────────────────────────────────────────────────────────────────────────
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  title text not null,
  stage text not null default 'novo_lead'
    check (stage in ('novo_lead', 'orcamento_enviado', 'negociando', 'fechado', 'perdido')),
  -- valores monetários sempre em centavos (inteiro), nunca float
  value_cents integer not null default 0 check (value_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_user_id_idx on public.deals (user_id);
create index deals_contact_id_idx on public.deals (contact_id);
create index deals_stage_idx on public.deals (stage);

alter table public.deals enable row level security;

create policy "deals: isolado por dono"
  on public.deals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- subscriptions — plano e status de pagamento do usuário (1:1 com o dono)
-- ─────────────────────────────────────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan text not null default 'trial',
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  gateway_customer_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

create policy "subscriptions: dono lê a própria assinatura"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Sem policy de insert/update/delete para o usuário comum: assinatura só
-- muda via webhook do gateway de pagamento, rodando com a service_role
-- key (que ignora RLS por design). Isso evita que um usuário edite o
-- próprio status de pagamento direto pela API.

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();
