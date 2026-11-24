// Conferência dos workflows do GitHub (spec 000, CA7.6), chamada pelo conferir-esteira.sh.
// Roda com o node puro (que executa TypeScript), como o check-lock: só módulos do próprio Node.
//
// Uso (na raiz): node api/scripts/conferir-workflows.ts [pasta]   (padrão: .github/workflows)
// Saída: código 1 com a lista dos problemas, ou 0 se todos os workflows estão certos.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { problemasDoWorkflow } from "./workflows.ts";

const pasta = process.argv[2] ?? ".github/workflows";
const problemas = readdirSync(pasta)
  .filter((arquivo) => /\.ya?ml$/.test(arquivo))
  .flatMap((arquivo) => problemasDoWorkflow(arquivo, readFileSync(join(pasta, arquivo), "utf8")));

if (problemas.length) {
  console.error(problemas.join("\n"));
  process.exit(1);
}
