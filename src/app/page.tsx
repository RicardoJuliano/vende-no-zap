import Link from "next/link";
import { WaitlistForm } from "./waitlist-form";
import { getWhatsAppLink } from "@/lib/config";

const DORES = [
  "Manda orçamento pelo WhatsApp e depois esquece de cobrar resposta.",
  "Já perdeu venda porque demorou demais pra responder alguém.",
  "Tenta organizar cliente em caderno, planilha ou nos favoritos do Zap — e não funciona.",
];

const PROMESSAS = [
  {
    titulo: "Funil visual",
    texto: "Cada conversa vira um card: novo lead, orçamento enviado, negociando, fechado.",
  },
  {
    titulo: "Lembrete automático",
    texto: "\"Faz 2 dias que você mandou orçamento pro João e ele não respondeu.\"",
  },
  {
    titulo: "Cobrança por Pix",
    texto: "Gera o Pix, manda pelo próprio WhatsApp, o card atualiza sozinho quando cai.",
  },
];

export default function Home() {
  const whatsappLink = getWhatsAppLink(
    "Oi! Vi o Vende no Zap e quero saber mais.",
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-16 px-6 py-14 sm:py-20">
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Vende no Zap
        </span>
        <Link
          href="/login"
          className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          Já sou cliente
        </Link>
      </header>

      <section className="space-y-6 text-center sm:text-left">
        <p className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          Em construção — lista de espera aberta
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Pare de perder venda porque esqueceu de responder no WhatsApp.
        </h1>
        <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400 sm:mx-0 mx-auto">
          Um CRM simples pra autônomos, lojas de bairro, salões, clínicas e
          prestadores de serviço que vendem pelo Zap e não têm tempo (nem
          paciência) para um sistema complicado.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Isso já aconteceu com você?
        </h2>
        <ul className="space-y-3">
          {DORES.map((dor) => (
            <li key={dor} className="flex gap-3 text-neutral-700 dark:text-neutral-300">
              <span aria-hidden className="mt-1 text-emerald-600">→</span>
              <span>{dor}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          O que estamos construindo
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PROMESSAS.map((p) => (
            <div
              key={p.titulo}
              className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                {p.titulo}
              </h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {p.texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="lista-de-espera"
        className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 sm:p-8"
      >
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            Entre na lista de espera
          </h2>
          <p className="text-sm text-neutral-500">
            Quem entrar agora garante preço de fundador quando lançarmos.
          </p>
        </div>
        <WaitlistForm />
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-sm font-medium text-emerald-700 underline underline-offset-2 dark:text-emerald-400"
          >
            Prefere falar direto no WhatsApp? Clique aqui.
          </a>
        )}
      </section>

      <footer className="text-center text-xs text-neutral-400">
        Vende no Zap — {new Date().getFullYear()}
      </footer>
    </main>
  );
}
