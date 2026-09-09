"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { addContactNoteAction, getContactNotesAction } from "./pipeline-actions";
import { contactNoteSchema } from "@/lib/validations/pipeline";
import { dealStageLabel, type DealStage } from "@/lib/pipeline";
import type { ContactRow, DealRow } from "./types";

type Note = { id: string; body: string; createdAt: string };

export function ContactNotesPanel({
  deal,
  contact,
  onClose,
}: {
  deal: DealRow;
  contact: ContactRow;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getContactNotesAction(contact.id).then((result) => {
      if (cancelled) return;
      if (result.ok) setNotes(result.data);
      else setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [contact.id]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = contactNoteSchema.safeParse({ body });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Anotação inválida.");
      return;
    }

    startTransition(async () => {
      const result = await addContactNoteAction(contact.id, parsed.data);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setNotes((prev) => [result.data, ...(prev ?? [])]);
      setBody("");
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Contato ${contact.name}`}
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-t-2xl bg-white sm:rounded-2xl dark:bg-neutral-900"
      >
        <div className="border-b border-neutral-200 p-5 dark:border-neutral-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{contact.name}</h2>
              {contact.phone && <p className="text-sm text-neutral-500">{contact.phone}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-md px-2 py-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              ✕
            </button>
          </div>
          <span className="mt-2 inline-block rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium dark:bg-neutral-800">
            {dealStageLabel(deal.stage as DealStage)}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Anotações
          </h3>
          {notes === null && !loadError && (
            <p className="mt-2 text-sm text-neutral-400">Carregando…</p>
          )}
          {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
          {notes && notes.length === 0 && (
            <p className="mt-2 text-sm text-neutral-400">Nenhuma anotação ainda.</p>
          )}
          <ul className="mt-2 space-y-3">
            {notes?.map((note) => (
              <li key={note.id} className="border-l-2 border-neutral-200 pl-3 dark:border-neutral-700">
                <p className="text-sm text-neutral-800 dark:text-neutral-200">{note.body}</p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {new Date(note.createdAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-neutral-200 p-4 dark:border-neutral-800">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Registrar uma anotação…"
            rows={2}
            className="w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-neutral-700 dark:bg-neutral-900"
          />
          {formError && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isPending ? "Salvando…" : "Salvar anotação"}
          </button>
        </form>
      </div>
    </div>
  );
}
