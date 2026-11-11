import "dotenv/config";
import { defineConfig } from "vitest/config";

// Pequenos: funções puras em src/ (rodam em paralelo).
// Médios: PostgreSQL real em tests/ (um arquivo por vez, banco limpo entre testes).
export default defineConfig({
  test: {
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: { name: "pequeno", include: ["src/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "medio",
          include: ["tests/**/*.test.ts"],
          globalSetup: ["./tests/apoio/preparar-banco.ts"],
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/generated/**"],
      reporter: ["text", "html"],
    },
  },
});
