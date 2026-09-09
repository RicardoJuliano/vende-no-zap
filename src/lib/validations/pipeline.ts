import { z } from "zod";
import { DEAL_STAGE_KEYS } from "@/lib/pipeline";

/** Cadastro rápido de contato: nome + telefone obrigatórios, e-mail
 * opcional. Mesma regra de telefone/e-mail já usada na waitlist
 * (src/lib/validations/waitlist.ts), pra manter a mensagem de erro e o
 * nível de rigor consistentes em todo o app. */
export const quickContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do contato.")
    .max(120, "Nome muito longo."),
  phone: z
    .string()
    .trim()
    .min(8, "Informe um telefone com DDD.")
    .refine(
      (v) => {
        const digits = v.replace(/\D/g, "").length;
        return digits >= 10 && digits <= 13;
      },
      "Telefone inválido. Use DDD + número, ex: (11) 91234-5678.",
    ),
});

export type QuickContactInput = z.infer<typeof quickContactSchema>;

/** Corpo de uma anotação. */
export const contactNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Escreva alguma coisa antes de salvar.")
    .max(2000, "Anotação muito longa (máximo 2000 caracteres)."),
});

export type ContactNoteInput = z.infer<typeof contactNoteSchema>;

/** Mudança de estágio de um deal: só aceita uma das chaves definidas em
 * `DEAL_STAGES` (src/lib/pipeline.ts) — nunca uma string solta. */
export const dealStageSchema = z.object({
  stage: z.enum(DEAL_STAGE_KEYS as [string, ...string[]]),
});

export type DealStageInput = z.infer<typeof dealStageSchema>;
