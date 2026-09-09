import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso em Client Components (navegador).
 * Usa a chave anônima — todo acesso a dados passa pelas políticas de
 * Row Level Security definidas em supabase/migrations, nunca por
 * confiança na aplicação.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
