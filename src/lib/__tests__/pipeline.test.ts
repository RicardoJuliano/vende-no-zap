import { describe, expect, it } from "vitest";
import { DEAL_STAGE_KEYS, dealStageLabel, FOLLOWUP_STAGES } from "@/lib/pipeline";

describe("pipeline", () => {
  it("mantém as 5 chaves de estágio exatamente iguais ao check da migração 0001_init.sql", () => {
    // Se este teste quebrar depois de editar src/lib/pipeline.ts, o check
    // constraint em supabase/migrations/0001_init.sql precisa de uma nova
    // migração pra acompanhar — as duas listas têm que bater sempre.
    expect(DEAL_STAGE_KEYS).toEqual([
      "novo_lead",
      "orcamento_enviado",
      "negociando",
      "fechado",
      "perdido",
    ]);
  });

  it("resolve o rótulo de um estágio conhecido", () => {
    expect(dealStageLabel("orcamento_enviado")).toBe("Orçamento enviado");
  });

  it("estágios finais (fechado, perdido) não entram nos estágios de follow-up", () => {
    expect(FOLLOWUP_STAGES).not.toContain("fechado");
    expect(FOLLOWUP_STAGES).not.toContain("perdido");
  });
});
