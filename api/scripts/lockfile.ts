// Regras do check-lock (spec 000, CA7.1; plano §8 e §9), em funções puras para serem testadas
// sem rede. O check-lock.ts junta as informações do registro e da OSV e aplica estas regras.

const REGISTRO_DO_NPM = "https://registry.npmjs.org/";
const IDADE_MINIMA_DIAS = 7;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

export interface EntradaDoLock {
  name?: string;
  version?: string;
  resolved?: string;
  integrity?: string;
  link?: boolean;
  /** Vem dentro do tarball de outro pacote (bundleDependencies): sem resolved nem integrity. */
  inBundle?: boolean;
  hasInstallScript?: boolean;
}

export interface Lockfile {
  packages: Record<string, EntradaDoLock>;
}

export interface PacoteDoLock {
  nome: string;
  versao: string;
  resolved: string;
  integrity: string;
  temScriptDeInstalacao: boolean;
}

export type Gravidade = "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "DESCONHECIDA";

export interface Falha {
  id: string;
  gravidade: Gravidade;
}

export interface InfoDoPacote {
  /** Data de publicação da versão no registro, ou undefined se o registro não a conhece. */
  publicadoEm: Date | undefined;
  /** Falhas conhecidas na OSV para esta versão. */
  vulnerabilidades: Falha[];
}

export interface Avaliacao {
  /** Motivos que barram o pacote. */
  recusas: string[];
  /** O que não barra, mas fica registrado (falhas moderadas ou baixas). */
  avisos: string[];
}

/** "node_modules/a/node_modules/@b/c" → "@b/c". Devolve null para o que não é dependência. */
function nomeDaChave(chave: string): string | null {
  const marca = "node_modules/";
  const posicao = chave.lastIndexOf(marca);
  return posicao === -1 ? null : chave.slice(posicao + marca.length);
}

/**
 * Confere o lockfile inteiro, sem rede, antes do `npm ci`: toda dependência tem versão, aponta
 * para o tarball DELA no registro do npm (nome e versão) e traz integridade sha512. Assim, um
 * pacote antigo trocado por um endereço de fora, pelo tarball de outro pacote ou de outra versão
 * (que escaparia da idade mínima), ou com outra integridade, não passa só por "não ser novo".
 * O `npm ci` confere só a integridade, que bateria com o tarball trocado. Devolve os problemas.
 */
/** "@fastify/cors", "11.4.3" → "https://registry.npmjs.org/@fastify/cors/-/cors-11.4.3.tgz" */
function tarballNoRegistro(nome: string, versao: string): string {
  const semEscopo = nome.slice(nome.lastIndexOf("/") + 1);
  return `${REGISTRO_DO_NPM}${nome}/-/${semEscopo}-${versao}.tgz`;
}

export function problemasDoLock(lock: Lockfile): string[] {
  const problemas: string[] = [];
  for (const [chave, entrada] of Object.entries(lock.packages)) {
    if (!nomeDaChave(chave) || entrada.link || entrada.inBundle) continue;
    if (!entrada.version) problemas.push(`${chave}: sem versão`);
    const nome = entrada.name ?? nomeDaChave(chave) ?? "";
    const esperado = tarballNoRegistro(nome, entrada.version ?? "");
    if (!entrada.resolved?.startsWith(REGISTRO_DO_NPM)) problemas.push(`${chave}: não vem do registro do npm`);
    else if (entrada.version && entrada.resolved !== esperado) {
      problemas.push(`${chave}: aponta para outro tarball (o de ${nome}@${entrada.version ?? "?"} é ${esperado})`);
    }
    if (!entrada.integrity?.startsWith("sha512-")) problemas.push(`${chave}: sem integridade sha512`);
  }
  return problemas;
}

function pacotesDoLock(lock: Lockfile): PacoteDoLock[] {
  const pacotes: PacoteDoLock[] = [];
  for (const [chave, entrada] of Object.entries(lock.packages)) {
    const nome = nomeDaChave(chave);
    // Fora de node_modules/ ficam a raiz e os workspaces; "link" aponta para um workspace.
    if (!nome || entrada.link || !entrada.version) continue;
    pacotes.push({
      // Instalado com apelido (npm:nome@versão), o lockfile guarda o nome verdadeiro em "name".
      nome: entrada.name ?? nome,
      versao: entrada.version,
      resolved: entrada.resolved ?? "",
      integrity: entrada.integrity ?? "",
      temScriptDeInstalacao: entrada.hasInstallScript === true,
    });
  }
  return pacotes;
}

/** O que identifica o conteúdo: o mesmo nome@versão de outro endereço ou integridade é outro pacote. */
const identidade = (p: PacoteDoLock) => `${p.nome}@${p.versao} ${p.resolved} ${p.integrity}`;

/** Pacotes do lockfile novo cuja combinação nome@versão, endereço e integridade não existia no anterior. */
export function pacotesNovosOuAlterados(base: Lockfile, novo: Lockfile): PacoteDoLock[] {
  const existentes = new Set(pacotesDoLock(base).map(identidade));
  const vistos = new Set<string>();
  return pacotesDoLock(novo).filter((p) => {
    const chave = identidade(p);
    if (existentes.has(chave) || vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

const listar = (falhas: Falha[]) => falhas.map((f) => `${f.id} (${f.gravidade})`).join(", ");

/**
 * Avalia o pacote pelo protocolo da seção 5: recusa o que vem de fora do registro, o que tem
 * menos de 7 dias, falha alta, crítica ou de gravidade desconhecida, e script de instalação
 * fora do allowScripts. Falha moderada ou baixa só gera aviso.
 */
export function avaliarPacote(
  pacote: PacoteDoLock,
  info: InfoDoPacote,
  agora: Date,
  allowScripts: Record<string, boolean>,
): Avaliacao {
  if (!pacote.resolved.startsWith(REGISTRO_DO_NPM)) return { recusas: ["não vem do registro do npm"], avisos: [] };

  const recusas: string[] = [];
  const avisos: string[] = [];
  if (!info.publicadoEm) {
    recusas.push("versão não encontrada no registro do npm");
  } else {
    const dias = Math.floor((agora.getTime() - info.publicadoEm.getTime()) / UM_DIA_MS);
    if (dias < IDADE_MINIMA_DIAS) {
      recusas.push(`publicada há ${String(dias)} dia(s): o mínimo é ${String(IDADE_MINIMA_DIAS)}`);
    }
  }

  const graves = info.vulnerabilidades.filter((f) => f.gravidade === "HIGH" || f.gravidade === "CRITICAL");
  const desconhecidas = info.vulnerabilidades.filter((f) => f.gravidade === "DESCONHECIDA");
  const leves = info.vulnerabilidades.filter((f) => f.gravidade === "MODERATE" || f.gravidade === "LOW");
  if (graves.length) recusas.push(`falha alta ou crítica na OSV: ${listar(graves)}`);
  if (desconhecidas.length) {
    recusas.push(`falha de gravidade desconhecida na OSV: ${desconhecidas.map((f) => f.id).join(", ")}`);
  }
  if (leves.length) avisos.push(`falha moderada ou baixa na OSV: ${listar(leves)}`);

  const naLista = pacote.nome in allowScripts || `${pacote.nome}@${pacote.versao}` in allowScripts;
  if (pacote.temScriptDeInstalacao && !naLista) recusas.push("tem script de instalação e não está no allowScripts");
  return { recusas, avisos };
}
