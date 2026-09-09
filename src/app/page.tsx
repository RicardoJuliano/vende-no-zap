import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Vende no Zap</h1>
        <p className="max-w-md text-neutral-500">
          CRM leve para quem vende pelo WhatsApp. Fase 1 em construção — a
          landing page de verdade vem na Fase 0/5, esta tela existe só para
          testar login e cadastro.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
