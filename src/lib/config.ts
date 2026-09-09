/**
 * Número de WhatsApp que recebe contato direto pela landing page
 * (formato E.164 sem "+": código do país + DDD + número, ex: "5511999998888").
 *
 * Vem de variável de ambiente, não hardcoded no código — trocar o número
 * (ou preenchê-lo pela primeira vez, quando o WhatsApp comercial estiver
 * definido) é uma mudança de configuração, não de código. Só é lido no
 * servidor (a landing é renderizada em Server Component), por isso não
 * precisa do prefixo `NEXT_PUBLIC_`. Vazio/ausente = tratado como "ainda
 * não configurado": o botão de contato direto não aparece na landing.
 */
export const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER ?? "";

/**
 * Link "clique para conversar" do WhatsApp, ou `null` se nenhum número
 * foi passado (nem o `WHATSAPP_NUMBER` do ambiente) — quem chama decide o
 * que fazer com `null` (normalmente: não renderizar o botão).
 *
 * `number` é parâmetro (com o valor do ambiente como default) em vez de
 * ler `WHATSAPP_NUMBER` direto no corpo pra dar pra testar as duas
 * situações — "número configurado" e "não configurado" — sem precisar
 * mockar variável de ambiente.
 */
export function getWhatsAppLink(message: string, number: string = WHATSAPP_NUMBER): string | null {
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
