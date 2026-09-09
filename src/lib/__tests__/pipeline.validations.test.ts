import { describe, expect, it } from "vitest";
import { contactNoteSchema, dealStageSchema, quickContactSchema } from "@/lib/validations/pipeline";

describe("quickContactSchema", () => {
  it("aceita nome e telefone válidos", () => {
    expect(
      quickContactSchema.safeParse({ name: "João Pereira", phone: "(11) 91234-5678" }).success,
    ).toBe(true);
  });

  it("rejeita nome vazio", () => {
    expect(quickContactSchema.safeParse({ name: " ", phone: "11912345678" }).success).toBe(false);
  });

  it("rejeita telefone curto demais", () => {
    expect(quickContactSchema.safeParse({ name: "João", phone: "123" }).success).toBe(false);
  });
});

describe("contactNoteSchema", () => {
  it("rejeita corpo vazio", () => {
    expect(contactNoteSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("rejeita corpo maior que 2000 caracteres", () => {
    expect(contactNoteSchema.safeParse({ body: "a".repeat(2001) }).success).toBe(false);
  });

  it("aceita uma anotação normal", () => {
    expect(contactNoteSchema.safeParse({ body: "Ligou pedindo desconto." }).success).toBe(true);
  });
});

describe("dealStageSchema", () => {
  it("aceita qualquer uma das 5 chaves válidas", () => {
    expect(dealStageSchema.safeParse({ stage: "negociando" }).success).toBe(true);
  });

  it("rejeita uma string que não é estágio conhecido", () => {
    expect(dealStageSchema.safeParse({ stage: "ganhou_na_loteria" }).success).toBe(false);
  });
});
