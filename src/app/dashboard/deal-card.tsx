"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { DEAL_STAGES, type DealStage } from "@/lib/pipeline";
import { isOverdueForFollowup, daysSince } from "@/lib/reminders";
import type { ContactRow, DealRow } from "./types";

export function DealCard({
  deal,
  contact,
  onOpen,
  onStageChange,
}: {
  deal: DealRow;
  contact: ContactRow | undefined;
  onOpen: (dealId: string) => void;
  onStageChange: (dealId: string, stage: DealStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const overdue = isOverdueForFollowup({ stage: deal.stage, updatedAt: deal.updatedAt });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(deal.id)}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`cursor-grab touch-none rounded-lg border bg-white p-3 text-left shadow-sm transition active:cursor-grabbing dark:bg-neutral-900 ${
        isDragging
          ? "opacity-50"
          : overdue
            ? "border-amber-300 dark:border-amber-700"
            : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <p className="font-medium text-neutral-900 dark:text-neutral-100">
        {contact?.name ?? "Contato removido"}
      </p>
      {contact?.phone && (
        <p className="text-xs text-neutral-500">{contact.phone}</p>
      )}
      {deal.valueCents > 0 && (
        <p className="mt-1 text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
          {(deal.valueCents / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
      )}
      {overdue && (
        <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-400">
          ⏰ {daysSince(deal.updatedAt)}d sem resposta
        </p>
      )}

      {/* Fallback sem arrastar: sempre funciona, inclusive por teclado.
          stopPropagation no pointerDown pra não brigar com o listener de
          drag que está no card inteiro. */}
      <select
        value={deal.stage}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStageChange(deal.id, e.target.value as DealStage)}
        className="mt-2 w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
        aria-label={`Mover card de ${contact?.name ?? "contato"} para outro estágio`}
      >
        {DEAL_STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
