import { z } from "zod";

/**
 * Validação de entrada no servidor para os formulários de autenticação.
 * O Supabase Auth já rejeita e-mail/senha inválidos, mas validar aqui
 * também garante mensagens de erro em português e uma barreira própria
 * caso o provedor de auth mude no futuro.
 */
export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(120, "Nome muito longo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido."),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(72, "Senha muito longa."),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
