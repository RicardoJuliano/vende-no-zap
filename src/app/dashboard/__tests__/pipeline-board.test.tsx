import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PipelineBoard } from "../pipeline-board";
import { DEAL_STAGES } from "@/lib/pipeline";
import type { ContactRow, DealRow } from "../types";

const contacts: ContactRow[] = [{ id: "c1", name: "Maria Souza", phone: "11999998888" }];

const deals: DealRow[] = [
  {
    id: "d1",
    title: "Negociação com Maria Souza",
    stage: "novo_lead",
    valueCents: 0,
    contactId: "c1",
    updatedAt: new Date().toISOString(),
  },
];

describe("PipelineBoard", () => {
  it("renderiza uma coluna pra cada estágio definido em src/lib/pipeline.ts", () => {
    render(<PipelineBoard initialDeals={deals} initialContacts={contacts} />);

    for (const stage of DEAL_STAGES) {
      // getByRole("heading", ...) e não getByText: o rótulo também aparece
      // como <option> no select de fallback de cada card daquela coluna.
      expect(screen.getByRole("heading", { name: stage.label })).toBeInTheDocument();
    }
  });

  it("mostra o card do contato na coluna do estágio certo", () => {
    render(<PipelineBoard initialDeals={deals} initialContacts={contacts} />);

    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
  });

  it("tem o botão de adicionar novo contato", () => {
    render(<PipelineBoard initialDeals={deals} initialContacts={contacts} />);

    expect(screen.getByRole("button", { name: "+ Novo contato" })).toBeInTheDocument();
  });

  it("mostra estado vazio nas colunas sem card", () => {
    render(<PipelineBoard initialDeals={deals} initialContacts={contacts} />);

    // 4 das 5 colunas estão vazias (só "novo_lead" tem 1 card)
    expect(screen.getAllByText("Nenhum card aqui.").length).toBe(DEAL_STAGES.length - 1);
  });
});
