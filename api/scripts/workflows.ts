// Regras dos workflows do GitHub (spec 000, CA7.6), em função pura para ser testada. O
// conferir-workflows.ts aplica as regras a cada arquivo da pasta .github/workflows.
//
// Sem parser de YAML (seria um pacote novo), as regras olham linha a linha e falham FECHADO: em
// vez de reconhecer cada jeito de escrever uma permissão de escrita, recusam a palavra "write" em
// qualquer lugar e os recursos do YAML que permitem escrever a mesma coisa de outro jeito (âncora,
// tag, chave complexa, valor na linha de baixo, escape, texto entre aspas em várias linhas). É uma
// heurística rígida, não um parser: o controle de verdade, do lado do GitHub, é a proteção da
// main (D19).

/** Commit de 40 caracteres: uma tag (v4) pode ser movida para outro código. */
const FIXADA_POR_SHA = /@[0-9a-f]{40}$/;

/** "write" em qualquer lugar fora de comentário, com qualquer caixa: o único valor de escrita. */
const ESCRITA = /\bwrite\b/i;

/** Gatilhos que rodam código vindo de fora com os segredos do repositório. */
const GATILHO_PROIBIDO = /\b(pull_request_target|workflow_run)\b/i;

/** Escape de caractere (_, \x5f): esconderia um nome proibido do texto conferido. */
const ESCAPE = /\\[ux]/i;

/** "uses: x@y" em qualquer lugar da linha, com ou sem aspas na chave e no valor. */
const USOS = /["']?\buses["']?\s*:\s*["']?([^\s,}\]"']*)/g;

/** Âncora (&nome) ou apelido (*nome) do YAML, fora de aspas. */
const ANCORA = /(^|[\s:,[{-])[&*][A-Za-z0-9_-]/;
/** Tag do YAML (!!str, !tag) logo depois de uma chave ou de um item de lista, fora de aspas. */
const TAG = /!!|[:-]\s*![A-Za-z<]/;
/** Chave complexa do YAML ("? chave" e ": valor" na linha de baixo). */
const CHAVE_COMPLEXA = /^\s*\?(\s|$)/;
/** A linha que tira a guarda das credenciais do checkout, sozinha (não dentro de um texto). */
const SEM_CREDENCIAIS = /^\s+persist-credentials:\s*false\s*$/;

interface Linha {
  semComentario: string;
  foraDeAspas: string;
  /** Uma "\" dentro de aspas duplas: no fim da linha, ela junta esta linha com a de baixo. */
  barraEmAspas: boolean;
  /** A linha termina com aspas abertas: o texto continua na linha de baixo. */
  aspasAbertas: boolean;
}

/** Varre a linha marcando o que está entre aspas; tira o comentário (só fora de aspas). */
function partes(linha: string): Linha {
  let aspas: string | null = null;
  let foraDeAspas = "";
  let barraEmAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const letra = linha.charAt(i);
    if (aspas) {
      if (aspas === '"' && letra === "\\") barraEmAspas = true;
      if (letra === aspas) aspas = null;
      continue;
    }
    if (letra === '"' || letra === "'") {
      aspas = letra;
      continue;
    }
    // Comentário: "#" no começo ou depois de um espaço, fora de aspas, até o fim da linha.
    if (letra === "#" && (i === 0 || /\s/.test(linha.charAt(i - 1)))) {
      return { semComentario: linha.slice(0, i), foraDeAspas, barraEmAspas, aspasAbertas: false };
    }
    foraDeAspas += letra;
  }
  return { semComentario: linha, foraDeAspas, barraEmAspas, aspasAbertas: aspas !== null };
}

const recuo = (linha: string) => linha.length - linha.trimStart().length;

/** As linhas do passo (item de lista "- ...") que contém a linha `indice`: [início, fim). */
function passoDe(linhas: string[], indice: number): [number, number] | null {
  // O "-" pode estar sozinho na linha (o passo começa na linha de baixo).
  const ehItem = (linha: string | undefined) => /^\s*-(\s|$)/.test(linha ?? "");
  let inicio = indice;
  while (inicio > 0 && !ehItem(linhas[inicio])) inicio--;
  // Sem item de lista acima, o "passo" seria o arquivo inteiro: recusado pelo chamador.
  if (!ehItem(linhas[inicio])) return null;
  const recuoDoItem = (linhas[inicio] ?? "").indexOf("-");
  let fim = inicio + 1;
  while (fim < linhas.length) {
    const linha = linhas[fim] ?? "";
    if (linha.trim() && recuo(linha) <= recuoDoItem) break;
    fim++;
  }
  return [inicio, fim];
}

/** Os problemas de um workflow, com o arquivo e a linha. Lista vazia: o workflow está certo. */
export function problemasDoWorkflow(nome: string, conteudo: string): string[] {
  const linhas = conteudo.split(/\r?\n/).map(partes);
  const semComentario = linhas.map((linha) => linha.semComentario);
  const problemas: string[] = [];
  const checkouts: number[] = [];

  linhas.forEach(({ semComentario: linha, foraDeAspas, barraEmAspas, aspasAbertas }, indice) => {
    const onde = `${nome}:${String(indice + 1)}`;
    const trecho = linha.trim();
    for (const [, uso = ""] of linha.matchAll(USOS)) {
      if (!uso) problemas.push(`${onde}: uses sem valor na mesma linha`);
      else if (uso.startsWith("./")) {
        if (uso.includes("..")) problemas.push(`${onde}: action local fora do repositório: ${uso}`);
      } else if (!FIXADA_POR_SHA.test(uso)) problemas.push(`${onde}: action sem SHA: ${uso}`);
      if (uso.toLowerCase().startsWith("actions/checkout@")) checkouts.push(indice);
    }
    if (ESCAPE.test(linha)) problemas.push(`${onde}: escape de caractere proibido: ${trecho}`);
    if (barraEmAspas) problemas.push(`${onde}: barra invertida dentro de aspas: ${trecho}`);
    if (aspasAbertas) problemas.push(`${onde}: texto entre aspas em várias linhas: ${trecho}`);
    if (ESCRITA.test(linha)) problemas.push(`${onde}: permissão de escrita: ${trecho}`);
    if (GATILHO_PROIBIDO.test(linha)) problemas.push(`${onde}: gatilho proibido: ${trecho}`);
    if (ANCORA.test(foraDeAspas)) problemas.push(`${onde}: âncora ou apelido do YAML: ${trecho}`);
    if (TAG.test(foraDeAspas)) problemas.push(`${onde}: tag do YAML: ${trecho}`);
    if (CHAVE_COMPLEXA.test(foraDeAspas)) problemas.push(`${onde}: chave complexa do YAML: ${trecho}`);
  });

  if (!/^permissions:[ \t]*\n[ \t]+contents:[ \t]*read\b/m.test(semComentario.join("\n"))) {
    problemas.push(`${nome}: sem "permissions: contents: read" no topo`);
  }
  // Cada checkout precisa da guarda no PRÓPRIO passo (um passo não tem uses e run ao mesmo tempo).
  for (const indice of checkouts) {
    const passo = passoDe(semComentario, indice);
    if (!passo) {
      problemas.push(`${nome}:${String(indice + 1)}: checkout fora de um passo da lista`);
      continue;
    }
    const [inicio, fim] = passo;
    if (!semComentario.slice(inicio, fim).some((linha) => SEM_CREDENCIAIS.test(linha))) {
      problemas.push(`${nome}:${String(indice + 1)}: checkout sem persist-credentials: false`);
    }
  }
  return problemas;
}
