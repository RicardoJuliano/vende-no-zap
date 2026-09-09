import { createClient } from "@/lib/supabase/server";
import { PipelineBoard } from "./pipeline-board";
import type { ContactRow, DealRow } from "./types";
import type { DealStage } from "@/lib/pipeline";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: contactsData }, { data: dealsData }] = await Promise.all([
    supabase.from("contacts").select("id, name, phone").order("created_at", { ascending: false }),
    supabase
      .from("deals")
      .select("id, title, stage, value_cents, contact_id, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const contacts: ContactRow[] = (contactsData ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
  }));

  const deals: DealRow[] = (dealsData ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    stage: d.stage as DealStage,
    valueCents: d.value_cents,
    contactId: d.contact_id,
    updatedAt: d.updated_at,
  }));

  return <PipelineBoard initialDeals={deals} initialContacts={contacts} />;
}
