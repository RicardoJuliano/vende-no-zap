import { describe, expect, it } from "vitest";
import { waitlistSchema } from "@/lib/validations/waitlist";

describe("waitlistSchema", () => {
  it("aceita nome e telefone válidos, sem e-mail", () => {
    const result = waitlistSchema.safeParse({
      name: "Maria Silva",
      phone: "(11) 91234-5678",
      email: "",
      website: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita telefone curto demais", () => {
    const result = waitlistSchema.safeParse({
      name: "Maria Silva",
      phone: "1234",
      email: "",
      website: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita e-mail inválido quando preenchido", () => {
    const result = waitlistSchema.safeParse({
      name: "Maria Silva",
      phone: "11912345678",
      email: "não-é-email",
      website: "",
    });
    expect(result.success).toBe(false);
  });

  it("trata o honeypot preenchido como inválido", () => {
    const result = waitlistSchema.safeParse({
      name: "Maria Silva",
      phone: "11912345678",
      email: "",
      website: "http://spam-bot.example",
    });
    expect(result.success).toBe(false);
  });
});
