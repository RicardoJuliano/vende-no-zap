import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

// Sem UPSTASH_REDIS_REST_URL/TOKEN no ambiente de teste, checkRateLimit usa
// o fallback em memória — é ele que este teste exercita.
describe("checkRateLimit (fallback em memória)", () => {
  it("libera até 5 chamadas por chave e bloqueia a 6ª", async () => {
    const key = `test:${crypto.randomUUID()}`;

    for (let i = 0; i < 5; i++) {
      expect(await checkRateLimit(key)).toBe(true);
    }
    expect(await checkRateLimit(key)).toBe(false);
  });

  it("mantém contadores independentes por chave", async () => {
    const keyA = `test:${crypto.randomUUID()}`;
    const keyB = `test:${crypto.randomUUID()}`;

    for (let i = 0; i < 5; i++) {
      await checkRateLimit(keyA);
    }

    expect(await checkRateLimit(keyA)).toBe(false);
    expect(await checkRateLimit(keyB)).toBe(true);
  });
});
