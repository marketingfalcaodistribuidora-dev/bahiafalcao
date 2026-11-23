// Testes da API (spec 000, T002): unitários, integração, contrato e segurança.
// A performance tem configuração própria (vitest.perf.config.ts), fora da cobertura e do `npm test`.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Um processo por arquivo: o certo para pg, Prisma e Testcontainers (explícito para uma
    // atualização do Vitest não trocar o padrão sem ninguém ver).
    pool: "forks",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/perf/**", "node_modules/**"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/modules/**", "src/plugins/**", "src/shared/**"],
      exclude: ["src/generated/**"],
      reporter: ["text", "html"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
