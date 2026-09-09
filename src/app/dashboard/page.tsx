import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { count: contactsCount } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Bem-vindo(a) de volta 👋
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fase 1 concluída: login, banco e isolamento por conta funcionando.
          O funil de vendas (Fase 2) entra aqui.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
        <p>
          Contatos cadastrados na sua conta:{" "}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {contactsCount ?? 0}
          </span>
        </p>
        <p className="mt-2">
          Este número já vem filtrado por Row Level Security — mesmo que a
          aplicação tivesse um bug, esta query jamais retornaria contatos de
          outra conta.
        </p>
      </div>
    </div>
  );
}
