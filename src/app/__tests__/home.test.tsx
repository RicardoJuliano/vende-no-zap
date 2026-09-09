import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Home (landing page da Fase 0)", () => {
  it("mostra a proposta de valor e o formulário de lista de espera", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /pare de perder venda/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText("Seu nome")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("WhatsApp com DDD")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /entrar na lista de espera/i }),
    ).toBeInTheDocument();
  });

  it("mantém um link para quem já é cliente entrar", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "Já sou cliente" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("não mostra o link direto do WhatsApp enquanto o número não está configurado", () => {
    render(<Home />);

    expect(
      screen.queryByText(/prefere falar direto no whatsapp/i),
    ).not.toBeInTheDocument();
  });
});
