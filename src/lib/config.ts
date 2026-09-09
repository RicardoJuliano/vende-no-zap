/**
 * Número de WhatsApp que recebe contato direto pela landing page
 * (formato E.164 sem "+": código do país + DDD + número, ex: "5511999998888").
 *
 * Deixado em branco de propósito — a Fase 0 está sendo lançada sem esse
 * número ainda. Preencha aqui assim que tiver o WhatsApp comercial
 * definido; o botão de contato direto aparece sozinho na landing page
 * quando este valor deixar de ser vazio.
 */
export const WHATSAPP_NUMBER = "";

/** Link "clique para conversar" do WhatsApp, ou null se o número (acima)
 * ainda não foi preenchido — quem chama isso decide o que fazer com null
 * (normalmente: não renderizar o botão). */
export function getWhatsAppLink(message: string): string | null {
  if (!WHATSAPP_NUMBER) return null;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
