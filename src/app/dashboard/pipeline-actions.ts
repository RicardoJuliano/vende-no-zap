"use server";

import { createClient } from "@/lib/supabase/server";
import { contactNoteSchema, dealStageSchema, quickContactSchema } from "@/lib/validations/pipeline";
import type { DealStage } from "@/lib/pipeline";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Toda action começa confirmando a sessão explicitamente. O RLS no banco
 * já bloquearia qualquer tentativa de mexer em dado de outro usuário —
 * isso aqui é a segunda camada: barra na aplicação, com uma mensagem
 * clara, antes mesmo de a query sair para o Postgres.
 */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  return { supabase, user };
}

/** Cria um contato e já abre um deal em "novo_lead" pra ele aparecer no
 * funil — é assim que "cadastro rápido" e "kanban" se conectam. */
export async function createContactAction(
  input: unknown,
): Promise<ActionResult<{ contactId: string; dealId: string }>> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login de novo." };

  const parsed = quickContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .insert({ user_id: user.id, name: parsed.data.name, phone: parsed.data.phone })
    .select("id")
    .single();

  if (contactError || !contact) {
    return { ok: false, error: "Não deu pra salvar o contato. Tenta de novo." };
  }

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert({
      user_id: user.id,
      contact_id: contact.id,
      title: `Negociação com ${parsed.data.name}`,
      stage: "novo_lead",
    })
    .select("id")
    .single();

  if (dealError || !deal) {
    return { ok: false, error: "Contato salvo, mas o card não foi criado. Recarregue a página." };
  }

  return { ok: true, data: { contactId: contact.id, dealId: deal.id } };
}

/** Move um card entre colunas do funil. */
export async function updateDealStageAction(
  dealId: string,
  input: unknown,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login de novo." };

  const parsed = dealStageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Estágio inválido." };
  }

  // .eq("user_id", ...) explícito: não é só o RLS que impede mexer no
  // deal de outra conta, a própria query já nasce restrita a quem é dono.
  const { error, count } = await supabase
    .from("deals")
    .update({ stage: parsed.data.stage as DealStage }, { count: "exact" })
    .eq("id", dealId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "Não deu pra mover o card. Tenta de novo." };
  }
  if (count === 0) {
    return { ok: false, error: "Card não encontrado." };
  }

  return { ok: true, data: undefined };
}

/** Registra uma anotação no histórico do contato. */
export async function addContactNoteAction(
  contactId: string,
  input: unknown,
): Promise<ActionResult<{ id: string; body: string; createdAt: string }>> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login de novo." };

  const parsed = contactNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data, error } = await supabase
    .from("contact_notes")
    .insert({ user_id: user.id, contact_id: contactId, body: parsed.data.body })
    .select("id, body, created_at")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não deu pra salvar a anotação. Tenta de novo." };
  }

  return { ok: true, data: { id: data.id, body: data.body, createdAt: data.created_at } };
}

/** Anotações de um contato, mais recentes primeiro — carregado sob
 * demanda quando o card é aberto, não de uma vez pra todos os contatos. */
export async function getContactNotesAction(
  contactId: string,
): Promise<ActionResult<{ id: string; body: string; createdAt: string }[]>> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login de novo." };

  const { data, error } = await supabase
    .from("contact_notes")
    .select("id, body, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: "Não deu pra carregar as anotações." };
  }

  return {
    ok: true,
    data: (data ?? []).map((n) => ({ id: n.id, body: n.body, createdAt: n.created_at })),
  };
}
