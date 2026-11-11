// Usado pelo hook pre-commit: barra o commit se algum arquivo preparado contiver um código
// interno REAL. O repositório é público; a lista real fica fora dele (produtos.json extraído).
// Uso: FALCAO_CATALOGO_REAL="<caminho>/produtos.json" tsx verificar-dados-reais.ts <arquivos...>
import { readFileSync } from "node:fs";
import { lerCatalogoExtraido } from "../importacao/entrada";
import { verificarSigilo } from "../importacao/sigilo";

const caminho = process.env.FALCAO_CATALOGO_REAL;
if (!caminho) {
  console.warn("pre-commit: AVISO: defina FALCAO_CATALOGO_REAL para conferir códigos internos reais.");
  process.exit(0);
}

const codigos = lerCatalogoExtraido(JSON.parse(readFileSync(caminho, "utf-8"))).flatMap((c) =>
  c.variantes.map((v) => v.codigo),
);
const textos = process.argv.slice(2).flatMap((arquivo) => {
  try {
    return [{ onde: arquivo, texto: readFileSync(arquivo, "utf-8") }];
  } catch {
    return [];
  }
});
const violacoes = verificarSigilo(textos, codigos).filter((v) => v.includes("código interno"));
if (violacoes.length) {
  console.error("pre-commit: BLOQUEADO. Código interno real em arquivo do commit:");
  for (const v of violacoes) console.error(`  ${v}`);
  process.exit(1);
}
