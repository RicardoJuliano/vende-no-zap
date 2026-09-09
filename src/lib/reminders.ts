import { FOLLOWUP_STAGES, FOLLOWUP_THRESHOLD_DAYS, type DealStage } from "@/lib/pipeline";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Dias inteiros desde `sinceIso` até `now` (arredondado pra baixo).
 * `now` é parâmetro, não `new Date()` direto no corpo, pra dar pra testar
 * com uma data fixa em vez de depender do relógio real.
 */
export function daysSince(sinceIso: string, now: Date = new Date()): number {
  const since = new Date(sinceIso).getTime();
  const diff = now.getTime() - since;
  return Math.floor(diff / MS_PER_DAY);
}

/**
 * true quando o card merece o aviso de follow-up: está num estágio que
 * ainda depende de resposta do cliente E faz tempo demais desde a última
 * mudança (`updated_at` do deal é o proxy usado pra "há quanto tempo está
 * neste estágio" — é o timestamp mais simples que já existe na tabela,
 * sem precisar de uma coluna nova só pra isso).
 */
export function isOverdueForFollowup(
  deal: { stage: DealStage; updatedAt: string },
  now: Date = new Date(),
): boolean {
  if (!FOLLOWUP_STAGES.includes(deal.stage)) return false;
  return daysSince(deal.updatedAt, now) >= FOLLOWUP_THRESHOLD_DAYS;
}

/** Texto do aviso, no formato do exemplo do plano. */
export function followupMessage(contactName: string, deal: { stage: DealStage; updatedAt: string }, now: Date = new Date()): string {
  const dias = daysSince(deal.updatedAt, now);
  const unidade = dias === 1 ? "dia" : "dias";
  return `Faz ${dias} ${unidade} que você mudou o card de ${contactName} e ele não respondeu.`;
}
