import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para uso em Server Components, Route Handlers e
 * Server Actions. Lê/escreve a sessão via cookies do Next.js.
 *
 * Continua usando a chave anônima: a identidade do usuário vem do
 * cookie de sessão, e o Postgres decide o que ele pode ler/escrever
 * através das políticas de RLS. Isso é o que garante que um bug na
 * aplicação (esquecer um `.eq("user_id", ...)`) não vaza dado de
 * outro usuário — a proteção vive no banco, não no código.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll chamado de um Server Component (sem acesso a escrita
            // de cookies). Inofensivo: o middleware já cuida de renovar
            // a sessão a cada request.
          }
        },
      },
    },
  );
}
