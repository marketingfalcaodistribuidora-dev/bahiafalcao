// check-lock (spec 000, CA7.1; plano §8 e §9): confere as dependências INDIRETAS.
// Primeiro, sem rede, o lockfile novo inteiro: toda dependência tem versão, vem do registro do
// npm e traz integridade sha512. Depois compara dois lockfiles e passa cada pacote novo ou alterado pelo protocolo: idade mínima,
// OSV, origem (registro do npm) e script de instalação (allowScripts do package.json da raiz).
// O `npm ci` instala o lockfile sem conferir a idade; é isto que fecha essa porta. Por isso roda
// ANTES do `npm ci`, com o node puro (que executa TypeScript) e só módulos do próprio Node.
//
// Uso (na raiz): node api/scripts/check-lock.ts <lockfile-anterior> <lockfile-novo>
// Saída: a lista do que foi conferido e, se algo falhar, código 1 com os motivos.
import { readFileSync } from "node:fs";
import {
  avaliarPacote,
  pacotesNovosOuAlterados,
  problemasDoLock,
  type Falha,
  type Gravidade,
  type Lockfile,
  type PacoteDoLock,
} from "./lockfile.ts";

const [caminhoBase, caminhoNovo] = process.argv.slice(2);
if (!caminhoBase || !caminhoNovo) {
  console.error("Uso: node api/scripts/check-lock.ts <lockfile-anterior> <lockfile-novo>");
  process.exit(2);
}

const lerJson = (caminho: string): unknown => JSON.parse(readFileSync(caminho, "utf8"));
const base = lerJson(caminhoBase) as Lockfile;
const novo = lerJson(caminhoNovo) as Lockfile;
const raiz = lerJson("package.json") as {
  allowScripts?: Record<string, boolean>;
  allowAliases?: Record<string, string>;
};
const allowScripts = raiz.allowScripts ?? {};

// Apelidos (npm:nome@faixa) só valem se já estavam na base ou na lista allowAliases revisada.
const problemas = problemasDoLock(novo, { base, apelidosPermitidos: raiz.allowAliases ?? {} });
if (problemas.length) {
  for (const problema of problemas) console.log(`RECUSADO ${problema}`);
  console.log(`check-lock: ${String(problemas.length)} problema(s) no lockfile; nada foi instalado.`);
  process.exit(1);
}

const pacotes = pacotesNovosOuAlterados(base, novo);
if (!pacotes.length) {
  console.log("check-lock: nenhum pacote novo ou alterado.");
  process.exit(0);
}

/** Roda `tarefa` em cada item, no máximo `limite` ao mesmo tempo. */
async function emParalelo<T, R>(itens: T[], limite: number, tarefa: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = [];
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await tarefa(itens[indice] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

/**
 * fetch com até 3 tentativas para erros passageiros de rede e respostas 429/5xx. Depois disso,
 * o erro sobe e o script falha (fechado): na dúvida, nada passa sem conferência.
 */
async function buscar(url: string, opcoes?: RequestInit): Promise<Response> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      const resposta = await fetch(url, opcoes);
      if ((resposta.status === 429 || resposta.status >= 500) && tentativa < 3)
        throw new Error(String(resposta.status));
      return resposta;
    } catch (erro) {
      if (tentativa >= 3) throw erro;
      await new Promise((pronto) => setTimeout(pronto, 1000 * tentativa));
    }
  }
}

/** Data de publicação da versão, pelo registro do npm (documento completo do pacote). */
async function publicadoEm(pacote: PacoteDoLock): Promise<Date | undefined> {
  const resposta = await buscar(`https://registry.npmjs.org/${pacote.nome.replace("/", "%2f")}`);
  if (!resposta.ok) return undefined;
  const documento = (await resposta.json()) as { time?: Record<string, unknown> };
  // Só a chave própria e em texto: uma versão como "constructor" não pode achar uma função.
  const tempos = documento.time ?? {};
  const data = Object.hasOwn(tempos, pacote.versao) ? tempos[pacote.versao] : undefined;
  return typeof data === "string" ? new Date(data) : undefined;
}

const GRAVIDADES: readonly string[] = ["CRITICAL", "HIGH", "MODERATE", "LOW"];

/** Gravidade de uma falha, pelo registro do alerta na OSV (GHSA: database_specific.severity). */
async function gravidadeDe(id: string): Promise<Gravidade> {
  const resposta = await buscar(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`);
  if (!resposta.ok) return "DESCONHECIDA";
  const alerta = (await resposta.json()) as { database_specific?: { severity?: string } };
  const gravidade = alerta.database_specific?.severity?.toUpperCase() ?? "";
  return GRAVIDADES.includes(gravidade) ? (gravidade as Gravidade) : "DESCONHECIDA";
}

/** Falhas conhecidas de cada pacote, numa consulta em lote à OSV, com a gravidade de cada uma. */
async function falhasDe(lista: PacoteDoLock[]): Promise<Falha[][]> {
  const ids: string[][] = lista.map(() => []);
  for (let inicio = 0; inicio < lista.length; inicio += 500) {
    const lote = lista.slice(inicio, inicio + 500);
    const resposta = await buscar("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: lote.map((p) => ({ package: { name: p.nome, ecosystem: "npm" }, version: p.versao })),
      }),
    });
    if (!resposta.ok) throw new Error(`OSV respondeu ${String(resposta.status)}`);
    const dados = (await resposta.json()) as { results: { vulns?: { id: string }[] }[] };
    dados.results.forEach((r, i) => {
      ids[inicio + i] = (r.vulns ?? []).map((v) => v.id);
    });
  }
  // Cada alerta é consultado uma vez só, no máximo 8 ao mesmo tempo.
  const unicos = [...new Set(ids.flat())];
  const porId = new Map(unicos.map((id, i) => [id, i]));
  const gravidades = await emParalelo(unicos, 8, gravidadeDe);
  return ids.map((doPacote) =>
    doPacote.map((id) => ({ id, gravidade: gravidades[porId.get(id) ?? -1] ?? "DESCONHECIDA" })),
  );
}

const agora = new Date();
const [datas, falhas] = await Promise.all([emParalelo(pacotes, 8, publicadoEm), falhasDe(pacotes)]);

let recusados = 0;
pacotes.forEach((pacote, i) => {
  const { recusas, avisos } = avaliarPacote(
    pacote,
    { publicadoEm: datas[i], vulnerabilidades: falhas[i] ?? [] },
    agora,
    allowScripts,
  );
  for (const aviso of avisos) console.log(`aviso    ${pacote.nome}@${pacote.versao}: ${aviso}`);
  if (recusas.length) {
    recusados++;
    console.log(`RECUSADO ${pacote.nome}@${pacote.versao}: ${recusas.join("; ")}`);
  }
});

console.log(
  `check-lock: ${String(pacotes.length)} pacote(s) novo(s) ou alterado(s), ${String(recusados)} recusado(s).`,
);
process.exit(recusados ? 1 : 0);
