import { describe, expect, it } from "vitest";
import { daysSince, followupMessage, isOverdueForFollowup } from "@/lib/reminders";

const NOW = new Date("2026-09-15T12:00:00Z");

describe("daysSince", () => {
  it("conta dias inteiros, arredondando pra baixo", () => {
    expect(daysSince("2026-09-13T12:00:00Z", NOW)).toBe(2);
    expect(daysSince("2026-09-14T13:00:00Z", NOW)).toBe(0); // 23h atrás, ainda não fechou 1 dia
  });
});

describe("isOverdueForFollowup", () => {
  it("marca atrasado um deal em 'orcamento_enviado' parado há 2+ dias", () => {
    expect(
      isOverdueForFollowup({ stage: "orcamento_enviado", updatedAt: "2026-09-13T12:00:00Z" }, NOW),
    ).toBe(true);
  });

  it("não marca um deal recém-atualizado", () => {
    expect(
      isOverdueForFollowup({ stage: "orcamento_enviado", updatedAt: "2026-09-15T10:00:00Z" }, NOW),
    ).toBe(false);
  });

  it("nunca marca estágios finais (fechado, perdido), não importa a data", () => {
    expect(isOverdueForFollowup({ stage: "fechado", updatedAt: "2020-01-01T00:00:00Z" }, NOW)).toBe(
      false,
    );
    expect(isOverdueForFollowup({ stage: "perdido", updatedAt: "2020-01-01T00:00:00Z" }, NOW)).toBe(
      false,
    );
  });

  it("não marca 'novo_lead' parado, só os estágios de acompanhamento ativo", () => {
    expect(
      isOverdueForFollowup({ stage: "novo_lead", updatedAt: "2020-01-01T00:00:00Z" }, NOW),
    ).toBe(false);
  });
});

describe("followupMessage", () => {
  it("usa singular pra 1 dia e plural pro resto", () => {
    expect(
      followupMessage("João", { stage: "negociando", updatedAt: "2026-09-14T12:00:00Z" }, NOW),
    ).toContain("1 dia ");
    expect(
      followupMessage("João", { stage: "negociando", updatedAt: "2026-09-12T12:00:00Z" }, NOW),
    ).toContain("3 dias");
  });
});
