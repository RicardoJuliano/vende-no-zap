/**
 * Única fonte de verdade do funil de vendas. Nomes de estágio, ordem das
 * colunas do kanban e limiar de dias para lembrete de follow-up vivem
 * todos aqui — em nenhum outro lugar do código deve aparecer a string
 * "orcamento_enviado" ou um rótulo tipo "Orçamento enviado" digitado de
 * novo. Isso existe porque a Fase 2 está sendo construída em paralelo às
 * entrevistas de validação (Etapa 5): quando elas voltarem, ajustar nome
 * de estágio ou prazo de lembrete deve ser uma mudança de uma linha aqui,
 * não uma caça a strings espalhadas.
 *
 * A ordem do array é a ordem das colunas no kanban. As chaves (`key`)
 * precisam bater exatamente com o `check` da coluna `stage` em
 * `supabase/migrations/0001_init.sql` — o teste em
 * `src/lib/__tests__/pipeline.test.ts` garante isso.
 */
export const DEAL_STAGES = [
  { key: "novo_lead", label: "Novo lead" },
  { key: "orcamento_enviado", label: "Orçamento enviado" },
  { key: "negociando", label: "Negociando" },
  { key: "fechado", label: "Fechado" },
  { key: "perdido", label: "Perdido" },
] as const;

export type DealStage = (typeof DEAL_STAGES)[number]["key"];

export const DEAL_STAGE_KEYS = DEAL_STAGES.map((s) => s.key) as DealStage[];

export function dealStageLabel(stage: DealStage): string {
  return DEAL_STAGES.find((s) => s.key === stage)?.label ?? stage;
}

/**
 * Estágios em que faz sentido cobrar follow-up — "fechado" e "perdido"
 * são estágios finais, ninguém precisa de lembrete pra voltar neles.
 */
export const FOLLOWUP_STAGES: DealStage[] = ["orcamento_enviado", "negociando"];

/** A partir de quantos dias sem mudança de estágio o card ganha o aviso
 * de follow-up (exemplo do plano: "faz 2 dias que você mandou orçamento
 * pro João e ele não respondeu"). Um só número, fácil de recalibrar. */
export const FOLLOWUP_THRESHOLD_DAYS = 2;
