// Testes da API (spec 000, T002 e T005). Dois projetos:
// - "unit": sem banco nem Docker; é o `npm test` (roda no pre-push e no CI);
// - "integracao": PostgreSQL real pelo Testcontainers; `npm run test:integration` (precisa do
//   Docker ligado). A cobertura (`npm run test:coverage`) soma os dois.
// A performance tem configuração própria (vitest.perf.config.ts), fora da cobertura e do `npm test`.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Um processo por arquivo: o certo para pg, Prisma e Testcontainers (explícito para uma
    // atualização do Vitest não trocar o padrão sem ninguém ver).
    pool: "forks",
    testTimeout: 30_000,
    projects: [
      {
        extends: true,
        // Primeiro os unitários (rápidos), depois a integração.
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], sequence: { groupOrder: 0 } },
      },
      {
        extends: true,
        test: {
          name: "integracao",
          sequence: { groupOrder: 1 },
          include: ["tests/integration/**/*.test.ts"],
          // Sobe um PostgreSQL por execução e prepara o banco-modelo (tests/apoio/global-setup.ts).
          globalSetup: ["tests/apoio/global-setup.ts"],
          // Cada arquivo abre poucas conexões (pool de 2 a 3); 4 processos ficam bem abaixo do
          // max_connections (100) do container.
          maxWorkers: 4,
          // Criar e apagar o banco do arquivo leva menos de 1 s; a folga cobre máquinas lentas.
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/modules/**", "src/plugins/**", "src/shared/**"],
      exclude: ["src/generated/**"],
      reporter: ["text", "html"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
