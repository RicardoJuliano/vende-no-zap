import { headers } from "next/headers";

/**
 * IP do visitante a partir dos headers de proxy (Vercel preenche
 * `x-forwarded-for`). Sem proxy na frente (dev local), cai em "unknown" —
 * o que ainda funciona para rate limit, só compartilha o mesmo balde
 * entre todas as requisições locais.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = h.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
