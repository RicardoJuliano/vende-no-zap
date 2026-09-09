import type { DealStage } from "@/lib/pipeline";

export type DealRow = {
  id: string;
  title: string;
  stage: DealStage;
  valueCents: number;
  contactId: string;
  updatedAt: string;
};

export type ContactRow = {
  id: string;
  name: string;
  phone: string | null;
};
