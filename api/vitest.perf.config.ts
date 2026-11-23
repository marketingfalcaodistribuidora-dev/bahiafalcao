// Medição de performance (spec 000, CA8.1 e CA8.2; plano §7). Separada dos testes comuns:
// sem cobertura (a instrumentação distorce o tempo), um arquivo por vez e fora do `npm test`.
// Roda contra o banco do docker-compose, não contra o Testcontainers.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/perf/**/*.perf.ts"],
    fileParallelism: false,
    testTimeout: 300_000,
    // A preparação compila a API, sobe o processo filho e espera o /health/ready.
    hookTimeout: 120_000,
    // Até a T027 não há medições; o comando não deve falhar por isso.
    passWithNoTests: true,
  },
});
