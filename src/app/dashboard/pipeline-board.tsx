"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { DEAL_STAGES, type DealStage } from "@/lib/pipeline";
import { isOverdueForFollowup, followupMessage } from "@/lib/reminders";
import { updateDealStageAction } from "./pipeline-actions";
import { DealCard } from "./deal-card";
import { QuickAddContact } from "./quick-add-contact";
import { ContactNotesPanel } from "./contact-notes-panel";
import type { ContactRow, DealRow } from "./types";

export function PipelineBoard({
  initialDeals,
  initialContacts,
}: {
  initialDeals: DealRow[];
  initialContacts: ContactRow[];
}) {
  const [deals, setDeals] = useState<DealRow[]>(initialDeals);
  const [contacts] = useState<Map<string, ContactRow>>(
    () => new Map(initialContacts.map((c) => [c.id, c])),
  );
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // Evita que o "click" de abrir o card dispare logo depois de um drag —
  // sem isso, soltar o card em cima dele mesmo abriria o painel de notas.
  const didDragRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const dealsByStage = useMemo(() => {
    const map = new Map<DealStage, DealRow[]>();
    for (const stage of DEAL_STAGES) map.set(stage.key, []);
    for (const deal of deals) map.get(deal.stage)?.push(deal);
    return map;
  }, [deals]);

  const overdueList = useMemo(
    () =>
      deals
        .filter((d) => isOverdueForFollowup({ stage: d.stage, updatedAt: d.updatedAt }))
        .map((d) => ({ deal: d, contact: contacts.get(d.contactId) })),
    [deals, contacts],
  );

  async function moveDeal(dealId: string, stage: DealStage) {
    const previous = deals;
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage, updatedAt: new Date().toISOString() } : d)));

    const result = await updateDealStageAction(dealId, { stage });
    if (!result.ok) {
      setDeals(previous);
      setBanner(result.error);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    didDragRef.current = true;
    setTimeout(() => {
      didDragRef.current = false;
    }, 0);

    const { active, over } = event;
    if (!over) return;
    const newStage = over.id as DealStage;
    const deal = deals.find((d) => d.id === active.id);
    if (!deal || deal.stage === newStage) return;
    void moveDeal(deal.id, newStage);
  }

  function handleOpen(dealId: string) {
    if (didDragRef.current) return;
    setOpenDealId(dealId);
  }

  const openDeal = deals.find((d) => d.id === openDealId);
  const openContact = openDeal ? contacts.get(openDeal.contactId) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Funil</h1>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Novo contato
        </button>
      </div>

      {banner && (
        <div className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)} aria-label="Fechar aviso">
            ✕
          </button>
        </div>
      )}

      {overdueList.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
            Lembretes de follow-up
          </p>
          <ul className="mt-1 space-y-1">
            {overdueList.map(({ deal, contact }) => (
              <li key={deal.id} className="text-sm text-amber-800 dark:text-amber-400">
                {followupMessage(contact?.name ?? "contato", deal)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex snap-x gap-3 overflow-x-auto pb-2">
          {DEAL_STAGES.map((stage) => (
            <Column
              key={stage.key}
              stageKey={stage.key}
              label={stage.label}
              deals={dealsByStage.get(stage.key) ?? []}
              contacts={contacts}
              onOpen={handleOpen}
              onStageChange={moveDeal}
            />
          ))}
        </div>
      </DndContext>

      {showQuickAdd && (
        <QuickAddContact
          onClose={() => setShowQuickAdd(false)}
          onCreated={(contact, deal) => {
            contacts.set(contact.id, contact);
            setDeals((prev) => [deal, ...prev]);
          }}
        />
      )}

      {openDeal && openContact && (
        <ContactNotesPanel deal={openDeal} contact={openContact} onClose={() => setOpenDealId(null)} />
      )}
    </div>
  );
}

function Column({
  stageKey,
  label,
  deals,
  contacts,
  onOpen,
  onStageChange,
}: {
  stageKey: DealStage;
  label: string;
  deals: DealRow[];
  contacts: Map<string, ContactRow>;
  onOpen: (dealId: string) => void;
  onStageChange: (dealId: string, stage: DealStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[85vw] flex-none snap-start flex-col gap-2 rounded-lg border p-2 sm:w-64 ${
        isOver
          ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
          : "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40"
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</h2>
        <span className="text-xs tabular-nums text-neutral-400">{deals.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            contact={contacts.get(deal.contactId)}
            onOpen={onOpen}
            onStageChange={onStageChange}
          />
        ))}
        {deals.length === 0 && (
          <p className="px-1 py-2 text-xs text-neutral-400">Nenhum card aqui.</p>
        )}
      </div>
    </div>
  );
}
