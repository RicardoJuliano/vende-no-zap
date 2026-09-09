"use server";

import { createClient } from "@/lib/supabase/server";
import { waitlistSchema } from "@/lib/validations/waitlist";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export type WaitlistState = {
  status: "idle" | "success" | "error";
  message: string;
};

const UNIQUE_VIOLATION = "23505";

// Mesma mensagem para: cadastro novo, telefone que já estava na lista, ou
// honeypot de bot. Se o texto mudasse conforme o caso, qualquer um poderia
// usar o formulário para descobrir se um número de telefone específico já
// está cadastrado — um jeito indireto de vazar quem entrou na lista.
const SUCCESS_MESSAGE = "Prontinho! Você entrou na lista de espera do Vende no Zap.";
const RATE_LIMIT_MESSAGE = "Muitas tentativas por aqui. Tenta de novo daqui a pouco.";
const GENERIC_ERROR_MESSAGE = "Não deu pra registrar agora. Tenta de novo em instantes?";

export async function joinWaitlistAction(
  _prevState: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`waitlist:${ip}`);
  if (!allowed) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  const parsed = waitlistSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    website: formData.get("website"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Confira os dados e tente de novo.",
    };
  }

  // Honeypot preenchido: quase certeza de bot. Devolve a mesma mensagem de
  // sucesso sem gravar nada — não vale alertar o robô de que foi barrado.
  if (parsed.data.website) {
    return { status: "success", message: SUCCESS_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_signups").insert({
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
  });

  if (error && error.code !== UNIQUE_VIOLATION) {
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }

  // error.code === UNIQUE_VIOLATION (telefone já cadastrado) cai aqui
  // também, de propósito: mesmo resultado visível do sucesso normal.
  return { status: "success", message: SUCCESS_MESSAGE };
}
