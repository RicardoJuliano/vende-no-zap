"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createContactAction } from "./pipeline-actions";
import { quickContactSchema } from "@/lib/validations/pipeline";
import type { DealRow, ContactRow } from "./types";

export function QuickAddContact({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (contact: ContactRow, deal: DealRow) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = quickContactSchema.safeParse({ name, phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    startTransition(async () => {
      const result = await createContactAction(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCreated(
        { id: result.data.contactId, name: parsed.data.name, phone: parsed.data.phone },
        {
          id: result.data.dealId,
          title: `Negociação com ${parsed.data.name}`,
          stage: "novo_lead",
          valueCents: 0,
          contactId: result.data.contactId,
          updatedAt: new Date().toISOString(),
        },
      );
      onClose();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Novo contato"
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl dark:bg-neutral-900"
      >
        <h2 className="text-lg font-semibold">Novo contato</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
          <input
            autoFocus
            type="text"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            type="tel"
            placeholder="WhatsApp com DDD"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium dark:border-neutral-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isPending ? "Salvando…" : "Adicionar ao funil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-neutral-700 dark:bg-neutral-900";
