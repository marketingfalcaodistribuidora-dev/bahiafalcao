// Carga inicial do catálogo (plano 002, §2.3).
// Uso: npm run importar -w packages/catalogo-dominio -- --origem "<pasta com produtos.json>"
// Variáveis: DATABASE_URL_PAINEL e CIDADE_UF_SEO (ex.: "Feira de Santana – BA", igual a frontend/src/lib/site.ts).
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { criarCliente } from "../banco";
import { lerCatalogoExtraido } from "./entrada";
import { gravarImportacao } from "./gravar";
import { montarImportacao } from "./montar";
import { montarRelatorio, relatorioEmMarkdown } from "./relatorio";

function exigir(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Defina ${nome} (veja packages/catalogo-dominio/.env.example).`);
  return valor;
}

async function principal() {
  const { values } = parseArgs({ options: { origem: { type: "string" }, "so-relatorio": { type: "boolean" } } });
  if (!values.origem) throw new Error('Informe a pasta extraída: --origem "<pasta>"');

  const cards = lerCatalogoExtraido(JSON.parse(readFileSync(join(values.origem, "produtos.json"), "utf-8")));
  const resultado = montarImportacao(cards, { local: exigir("CIDADE_UF_SEO") });
  const relatorio = montarRelatorio(resultado);

  // Relatório fora do Git: lista alertas com códigos internos.
  const pasta = resolve(import.meta.dirname, "../../../../importacao-relatorios");
  mkdirSync(pasta, { recursive: true });
  const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(join(pasta, `${carimbo}.md`), relatorioEmMarkdown(relatorio));
  writeFileSync(
    join(pasta, `${carimbo}.json`),
    JSON.stringify({ relatorio, violacoesDeSigilo: resultado.violacoesDeSigilo }, null, 2),
  );
  console.log(relatorioEmMarkdown(relatorio).split("## Alertas")[0]);
  console.log(`Relatório completo em ${pasta}`);

  if (resultado.violacoesDeSigilo.length) {
    console.error(`Sigilo: ${resultado.violacoesDeSigilo.length} violação(ões). Primeiras:`);
    for (const v of resultado.violacoesDeSigilo.slice(0, 10)) console.error(`  ${v}`);
  }
  if (values["so-relatorio"]) return;

  const banco = criarCliente(exigir("DATABASE_URL_PAINEL"));
  try {
    const inicio = Date.now();
    await gravarImportacao(banco, resultado);
    console.log(`Importação gravada em ${((Date.now() - inicio) / 1000).toFixed(1)} s.`);
  } finally {
    await banco.$disconnect();
  }
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
