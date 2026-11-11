import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrações rodam com o papel dono (catalogo_migracoes). Ver infra/dev e o plano 003, §3.
// A conexão é opcional aqui porque "prisma generate" (postinstall no CI) não precisa dela;
// os comandos de migração falham com mensagem clara se DATABASE_URL faltar.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
