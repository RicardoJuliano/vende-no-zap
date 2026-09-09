import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";

describe("signUpSchema", () => {
  it("aceita dados válidos e normaliza e-mail para minúsculas", () => {
    const result = signUpSchema.parse({
      name: "Maria Silva",
      email: "Maria@Exemplo.com",
      password: "senha-forte-123",
    });
    expect(result.email).toBe("maria@exemplo.com");
  });

  it("rejeita senha curta", () => {
    const result = signUpSchema.safeParse({
      name: "Maria Silva",
      email: "maria@exemplo.com",
      password: "123",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    const result = signUpSchema.safeParse({
      name: "Maria Silva",
      email: "não-é-email",
      password: "senha-forte-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    const result = signUpSchema.safeParse({
      name: " ",
      email: "maria@exemplo.com",
      password: "senha-forte-123",
    });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("exige e-mail válido e senha não vazia", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.com", password: "" }).success,
    ).toBe(false);

    expect(
      signInSchema.safeParse({ email: "a@b.com", password: "qualquer" })
        .success,
    ).toBe(true);
  });
});
