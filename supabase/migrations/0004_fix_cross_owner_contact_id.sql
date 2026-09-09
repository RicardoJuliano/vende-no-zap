-- Vende no Zap — corrige brecha de autorização: contact_id de outro dono
--
-- Achado ao testar o isolamento entre contas da Fase 2 (não é um bug novo,
-- estava desde a 0001_init.sql): as policies de `deals` e `conversations`
-- só conferiam `auth.uid() = user_id` — nunca se o `contact_id` referenciado
-- de fato pertencia a esse mesmo usuário. Na prática, um usuário B
-- autenticado conseguia:
--   - criar um `deal` com `contact_id` apontando pro contato de A;
--   - criar uma `contact_notes` com `contact_id` apontando pro contato de A.
-- Não vaza dado de A pra B (o SELECT de A continua filtrado por
-- `user_id = A`, então B nunca aparece na visão de A), mas é uma escrita
-- indevida: lixo/spam anexado a um recurso de outro dono, sem
-- autorização nenhuma pra isso. Exigir UUID de contato alheio pra
-- explorar reduz o risco prático, mas a política deveria barrar isso de
-- qualquer forma — é exatamente o tipo de coisa que "RLS escrito não é
-- RLS testado" (docs/fase-1-checklist-seguranca.md) existe pra pegar.

create or replace function public.user_owns_contact(p_contact_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from public.contacts c
    where c.id = p_contact_id and c.user_id = auth.uid()
  );
$$;

-- contact_notes: insert agora também exige que o contato seja do mesmo dono
drop policy "contact_notes: dono cria anotação" on public.contact_notes;
create policy "contact_notes: dono cria anotação"
  on public.contact_notes for insert
  with check (auth.uid() = user_id and public.user_owns_contact(contact_id));

-- deals: idem — vale tanto pra criar quanto pra atualizar (não dá pra
-- "reatribuir" um deal existente pro contato de outra pessoa também)
drop policy "deals: isolado por dono" on public.deals;
create policy "deals: isolado por dono"
  on public.deals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.user_owns_contact(contact_id));

-- conversations: mesmo padrão, corrigido preventivamente — ainda não é
-- usada pela aplicação (isso é Fase 3), mas o esquema já existe desde a
-- 0001_init.sql com a mesma brecha.
drop policy "conversations: isolado por dono" on public.conversations;
create policy "conversations: isolado por dono"
  on public.conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.user_owns_contact(contact_id));
