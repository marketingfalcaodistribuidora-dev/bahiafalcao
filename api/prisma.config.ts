// Configuração do CLI do Prisma (spec 000, T007). O Prisma 7 não lê o .env sozinho:
// quando DATABASE_URL não vem do ambiente (CI, testes), ela é lida do api/.env.
// process.loadEnvFile não sobrescreve o que já está definido, então nada do .env local
// vaza para os testes, que passam a própria DATABASE_URL.
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

const arquivoEnv = new URL(".env", import.meta.url);
if (!process.env["DATABASE_URL"] && existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Só os comandos que falam com o banco (migrate) precisam da URL; o generate não.
  datasource: { url: process.env["DATABASE_URL"] ?? "" },
});
