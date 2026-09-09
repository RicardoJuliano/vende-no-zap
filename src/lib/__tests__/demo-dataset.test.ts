import { describe, expect, it } from "vitest";
import { buildDemoDataset } from "@/lib/demo-dataset";
import { isOverdueForFollowup } from "@/lib/reminders";
import { DEAL_STAGE_KEYS } from "@/lib/pipeline";

const NOW = new Date("2026-09-20T12:00:00Z");

describe("buildDemoDataset", () => {
  it("tem ~15 contatos, todos com nome e telefone", () => {
    const { contacts } = buildDemoDataset(NOW);
    expect(contacts.length).toBe(15);
    for (const c of contacts) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.phone.length).toBeGreaterThan(0);
    }
  });

  it("cobre todos os 5 estágios do funil", () => {
    const { deals } = buildDemoDataset(NOW);
    const stagesUsed = new Set(deals.map((d) => d.stage));
    for (const key of DEAL_STAGE_KEYS) {
      expect(stagesUsed.has(key)).toBe(true);
    }
  });

  it("todo deal referencia um contactIndex válido", () => {
    const { contacts, deals, notes } = buildDemoDataset(NOW);
    for (const d of deals) {
      expect(d.contactIndex).toBeGreaterThanOrEqual(0);
      expect(d.contactIndex).toBeLessThan(contacts.length);
    }
    for (const n of notes) {
      expect(n.contactIndex).toBeGreaterThanOrEqual(0);
      expect(n.contactIndex).toBeLessThan(contacts.length);
    }
  });

  it("valores em centavos, dentro da faixa realista de pequeno comércio (R$80-R$1.500)", () => {
    const { deals } = buildDemoDataset(NOW);
    for (const d of deals) {
      expect(Number.isInteger(d.valueCents)).toBe(true);
      expect(d.valueCents).toBeGreaterThanOrEqual(8000);
      expect(d.valueCents).toBeLessThanOrEqual(150000);
    }
  });

  it("gera pelo menos 2 deals que aparecem como lembrete atrasado", () => {
    const { deals } = buildDemoDataset(NOW);
    const overdueCount = deals.filter((d) =>
      isOverdueForFollowup({ stage: d.stage, updatedAt: d.updatedAt ?? NOW.toISOString() }, NOW),
    ).length;
    expect(overdueCount).toBeGreaterThanOrEqual(2);
  });

  it("é determinístico: mesma data de referência gera o mesmo dataset", () => {
    const a = buildDemoDataset(NOW);
    const b = buildDemoDataset(NOW);
    expect(a).toEqual(b);
  });
});
