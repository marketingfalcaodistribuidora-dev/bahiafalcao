// globalSetup dos testes médios: confere o banco e aplica as migrações uma vez.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { urlsDeTeste } from "./urls";

export default function prepararBanco() {
  const { migracoes } = urlsDeTeste();
  const prisma = createRequire(import.meta.url).resolve("prisma/build/index.js");
  try {
    execFileSync(process.execPath, [prisma, "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: migracoes },
      stdio: "pipe",
    });
  } catch (erro) {
    const saida = String((erro as { stderr?: Buffer }).stderr ?? erro);
    throw new Error(`Não foi possível migrar o banco de testes. O banco está no ar? (npm run db:subir)\n${saida}`);
  }
}
