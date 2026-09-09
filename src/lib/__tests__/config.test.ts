import { describe, expect, it } from "vitest";
import { getWhatsAppLink } from "@/lib/config";

describe("getWhatsAppLink", () => {
  it("retorna null quando nenhum número está configurado", () => {
    expect(getWhatsAppLink("Oi!", "")).toBeNull();
  });

  it("monta o link wa.me com a mensagem codificada quando há número", () => {
    const link = getWhatsAppLink("Oi! Vi o Vende no Zap e quero saber mais.", "5511999998888");

    expect(link).toBe(
      "https://wa.me/5511999998888?text=Oi!%20Vi%20o%20Vende%20no%20Zap%20e%20quero%20saber%20mais.",
    );
  });

  it("não deixa a mensagem quebrar a URL (caracteres especiais escapados)", () => {
    const link = getWhatsAppLink("50% off & grátis?", "5511999998888");

    expect(link).not.toContain("&grátis"); // teria virado um parâmetro extra se não escapasse
    expect(link).toContain(encodeURIComponent("50% off & grátis?"));
  });
});
