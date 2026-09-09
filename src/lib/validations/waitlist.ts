import { z } from "zod";

function countDigits(value: string) {
  return value.replace(/\D/g, "").length;
}

/**
 * Validação do formulário da landing page (Fase 0). Coleta só nome,
 * telefone e e-mail — nada além disso, por definição do checklist de
 * segurança da fase (sem CPF, sem dado sensível).
 */
export const waitlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(120, "Nome muito longo."),
  phone: z
    .string()
    .trim()
    .min(8, "Informe um telefone com DDD.")
    .refine(
      (v) => countDigits(v) >= 10 && countDigits(v) <= 13,
      "Telefone inválido. Use DDD + número, ex: (11) 91234-5678.",
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido.")
    .optional()
    .or(z.literal("")),
  // Honeypot anti-spam: campo escondido no CSS que uma pessoa nunca
  // preenche, mas um bot preenchendo o formulário automaticamente sim.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
