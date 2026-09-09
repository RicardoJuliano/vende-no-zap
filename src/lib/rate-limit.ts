import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW = "1 h";
const MAX_REQUESTS = 5;

/**
 * Limiter compartilhado via Upstash Redis — funciona corretamente mesmo
 * com várias instâncias serverless (Vercel) batendo no mesmo Redis.
 * Só existe se as env vars estiverem configuradas; sem elas, cai no
 * fallback em memória abaixo.
 */
const upstashLimiter = createUpstashLimiter();

function createUpstashLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW),
    prefix: "vende-no-zap",
  });
}

/**
 * Fallback em memória: só protege UMA instância de servidor de cada vez.
 * Em produção na Vercel, funções serverless podem escalar para várias
 * instâncias em paralelo — cada uma teria seu próprio contador, então
 * este fallback NÃO é uma garantia real de limite sob carga distribuída.
 * Ainda assim, é melhor que nada em dev local e enquanto o Upstash não
 * está configurado (UPSTASH_REDIS_REST_URL/TOKEN em .env.local).
 */
const memoryStore = new Map<string, { count: number; resetAt: number }>();
const MEMORY_WINDOW_MS = 60 * 60 * 1000;

function checkMemoryLimit(key: string): boolean {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + MEMORY_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) return false;

  entry.count += 1;
  return true;
}

/** true = pode seguir, false = estourou o limite (5 por hora por chave). */
export async function checkRateLimit(key: string): Promise<boolean> {
  if (upstashLimiter) {
    const { success } = await upstashLimiter.limit(key);
    return success;
  }
  return checkMemoryLimit(key);
}
