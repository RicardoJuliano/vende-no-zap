"use server";

import { createClient } from "@/lib/supabase/server";
import { waitlistSchema } from "@/lib/validations/waitlist";

export type WaitlistState = {
  status: "idle" | "success" | "error";
  message: string;
};

const UNIQUE_VIOLATION = "23505";

export async function joinWaitlistAction(
  _prevState: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
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

  // Honeypot preenchido: quase certeza de bot. Devolve sucesso sem
  // gravar nada — não vale alertar o robô de que foi barrado.
  if (parsed.data.website) {
    return { status: "success", message: "Você entrou na lista de espera!" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_signups").insert({
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "success",
        message: "Esse telefone já está na nossa lista. Já vamos te chamar!",
      };
    }
    return {
      status: "error",
      message: "Não deu pra registrar agora. Tenta de novo em instantes?",
    };
  }

  return {
    status: "success",
    message: "Prontinho! Você entrou na lista de espera do Vende no Zap.",
  };
}
