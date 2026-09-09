import { FOLLOWUP_THRESHOLD_DAYS, type DealStage } from "@/lib/pipeline";

/**
 * Dados fixos da conta de demonstração — usados pelo script
 * `scripts/seed-demo.ts` (`npm run seed:demo`). Ficam aqui, tipados e
 * testáveis, em vez de dentro do script, por dois motivos: dá pra testar
 * sem precisar de rede/banco, e os estágios usados aqui vêm de
 * `DEAL_STAGE_KEYS`/`FOLLOWUP_THRESHOLD_DAYS` — nunca uma string ou um
 * número de dias solto, redigitado, que poderia desalinhar do resto do
 * app.
 */

export type DemoContact = { name: string; phone: string };

export type DemoDeal = {
  contactIndex: number;
  title: string;
  stage: DealStage;
  valueCents: number;
  /** ISO 8601. Ausente = usa "agora" (default do banco). */
  updatedAt?: string;
};

export type DemoNote = { contactIndex: number; body: string };

export type DemoDataset = {
  contacts: DemoContact[];
  deals: DemoDeal[];
  notes: DemoNote[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** `daysAgo` dias atrás de `now`, em ISO — usado pra "plantar" deals já
 * atrasados o suficiente pra aparecer como lembrete, não importa o valor
 * atual de FOLLOWUP_THRESHOLD_DAYS. */
function daysAgoIso(daysAgo: number, now: Date): string {
  return new Date(now.getTime() - daysAgo * DAY_MS).toISOString();
}

export function buildDemoDataset(now: Date = new Date()): DemoDataset {
  // threshold + 1 (e +2) garante que o card já está "atrasado" mesmo se
  // alguém baixar o limiar depois das entrevistas.
  const overdueSoon = FOLLOWUP_THRESHOLD_DAYS + 1;
  const overdueLonger = FOLLOWUP_THRESHOLD_DAYS + 2;

  const contacts: DemoContact[] = [
    { name: "Carlos Mendes", phone: "(38) 99123-4501" },
    { name: "Fernanda Rocha", phone: "(38) 99123-4502" },
    { name: "Seu José (Padaria do José)", phone: "(38) 99123-4503" },
    { name: "Dona Rosa", phone: "(38) 99123-4504" },
    { name: "Marcos Paulo", phone: "(38) 99123-4505" },
    { name: "Juliana Alves", phone: "(38) 99123-4506" },
    { name: "Roberto Silva", phone: "(38) 99123-4507" },
    { name: "Patrícia Souza", phone: "(38) 99123-4508" },
    { name: "Anderson Costa", phone: "(38) 99123-4509" },
    { name: "Camila Ferreira", phone: "(38) 99123-4510" },
    { name: "Bruno Oliveira", phone: "(38) 99123-4511" },
    { name: "Cida Nunes (Salão da Cida)", phone: "(38) 99123-4512" },
    { name: "Eduardo Lima", phone: "(38) 99123-4513" },
    { name: "Vanessa Martins", phone: "(38) 99123-4514" },
    { name: "Thiago Ramos", phone: "(38) 99123-4515" },
  ];

  const deals: DemoDeal[] = [
    { contactIndex: 0, title: "Bolo de aniversário", stage: "novo_lead", valueCents: 15000 },
    {
      contactIndex: 1,
      title: "2 bolos pra sábado",
      stage: "orcamento_enviado",
      valueCents: 32000,
      updatedAt: daysAgoIso(overdueSoon, now),
    },
    {
      contactIndex: 2,
      title: "Encomenda semanal de pães",
      stage: "negociando",
      valueCents: 89000,
      updatedAt: daysAgoIso(overdueLonger, now),
    },
    { contactIndex: 3, title: "Chá de bebê", stage: "fechado", valueCents: 45000 },
    { contactIndex: 4, title: "Kit festa infantil", stage: "perdido", valueCents: 20000 },
    { contactIndex: 5, title: "Docinhos pra evento", stage: "novo_lead", valueCents: 9500 },
    { contactIndex: 6, title: "Bolo + salgados corporativo", stage: "orcamento_enviado", valueCents: 120000 },
    { contactIndex: 7, title: "Torta de casamento", stage: "negociando", valueCents: 68000 },
    { contactIndex: 8, title: "Cupcakes personalizados", stage: "novo_lead", valueCents: 15000 },
    { contactIndex: 9, title: "Bolo de 1 aninho", stage: "fechado", valueCents: 30000 },
    { contactIndex: 10, title: "Salgados pra churrasco", stage: "perdido", valueCents: 8000 },
    { contactIndex: 11, title: "Pacote mensal de manicure", stage: "negociando", valueCents: 25000 },
    { contactIndex: 12, title: "Bolo de formatura", stage: "novo_lead", valueCents: 50000 },
    { contactIndex: 13, title: "Festa de 15 anos", stage: "orcamento_enviado", valueCents: 150000 },
    { contactIndex: 14, title: "Bolo simples", stage: "fechado", valueCents: 12000 },
  ];

  const notes: DemoNote[] = [
    { contactIndex: 0, body: "Perguntou sobre horário de entrega." },
    { contactIndex: 1, body: "Pediu orçamento de 2 bolos pra sábado." },
    { contactIndex: 2, body: "Disse que ia pensar, cobrar quinta." },
    { contactIndex: 3, body: "Fechou o pedido do chá de bebê, combinar retirada." },
    { contactIndex: 4, body: "Achou caro, foi pra concorrência." },
    { contactIndex: 6, body: "Quer nota fiscal." },
    { contactIndex: 7, body: "Pediu desconto de 10%." },
    { contactIndex: 9, body: "Pagou via Pix, entrega marcada pra sexta." },
    { contactIndex: 11, body: "Quer saber se dá pra fazer plano trimestral." },
    { contactIndex: 13, body: "Orçamento de festa de 15 anos, tema borboletas." },
  ];

  return { contacts, deals, notes };
}
