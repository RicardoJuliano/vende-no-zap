"use client";

import { useActionState, useEffect, useRef } from "react";
import { joinWaitlistAction, type WaitlistState } from "@/app/actions/waitlist";

const initialState: WaitlistState = { status: "idle", message: "" };

export function WaitlistForm() {
  const [state, formAction, isPending] = useActionState(
    joinWaitlistAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
      >
        {state.message}
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          type="text"
          placeholder="Seu nome"
          autoComplete="name"
          required
          className={inputClass}
        />
        <input
          name="phone"
          type="tel"
          placeholder="WhatsApp com DDD"
          autoComplete="tel"
          required
          className={inputClass}
        />
      </div>
      <input
        name="email"
        type="email"
        placeholder="E-mail (opcional)"
        autoComplete="email"
        className={inputClass}
      />

      {/* honeypot anti-spam: invisível e fora da ordem de tab para humanos */}
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={isPending} className={buttonClass}>
        {isPending ? "Entrando na lista…" : "Quero entrar na lista de espera"}
      </button>

      <p className="text-xs leading-relaxed text-neutral-500">
        Usamos seu nome, telefone e e-mail só para avisar do lançamento e
        entender se o Vende no Zap resolve sua dor. Sem spam, sem repasse a
        terceiros.
      </p>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-emerald-500 dark:focus:ring-emerald-500";

const buttonClass =
  "w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60";
