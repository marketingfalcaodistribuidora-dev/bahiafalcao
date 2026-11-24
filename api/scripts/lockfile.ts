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
  /** Os pacotes que vêm dentro do tarball deste. */
  bundleDependencies?: string[] | boolean;
  hasInstallScript?: boolean;
  /** Só na raiz (""): as pastas dos workspaces. */
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const PARTE_DO_NOME = /^[a-z0-9][a-z0-9._~-]*$/;

/** Nome de pacote do npm: minúsculas, com escopo opcional (@escopo/nome). */
function ehNomeDoNpm(nome: string): boolean {
  const [primeira = "", segunda, ...resto] = nome.split("/");
  if (resto.length) return false;
  if (segunda === undefined) return PARTE_DO_NOME.test(primeira);
  return primeira.startsWith("@") && PARTE_DO_NOME.test(primeira.slice(1)) && PARTE_DO_NOME.test(segunda);
}

/** Versão semver estrita, com pré-lançamento opcional e sem metadados de build (+build). */
function ehSemverEstrito(versao: string): boolean {
  const hifen = versao.indexOf("-");
  const nucleo = hifen === -1 ? versao : versao.slice(0, hifen);
  const preLancamento = hifen === -1 ? null : versao.slice(hifen + 1);
  return /^\d+\.\d+\.\d+$/.test(nucleo) && (preLancamento === null || /^[0-9A-Za-z.-]+$/.test(preLancamento));
}

/** No que o check-lock confia além do lockfile novo, que vem de fora (de um PR). */
export interface Confianca {
  /** O lockfile da base (a main): o que já estava lá foi revisado. */
  base?: Lockfile;
  /** O allowAliases do package.json da raiz: { pasta: nome-verdadeiro }, num diff pequeno e revisado. */
  apelidosPermitidos?: Record<string, string>;
}

/**
 * Os apelidos (npm:nome@faixa) confiáveis, como "pasta\0nome": os da base e os da lista revisada.
 * Nem o `name` nem uma declaração npm: dentro do lockfile novo provam nada (ele vem de fora), e o
 * npm instala na pasta sem conferir se o tarball é do pacote que a pasta diz ser.
 */
function apelidosConfiaveis({ base, apelidosPermitidos = {} }: Confianca): Set<string> {
  const apelidos = new Set(Object.entries(apelidosPermitidos).map(([pasta, nome]) => `${pasta}\0${nome}`));
  for (const [chave, entrada] of Object.entries(base?.packages ?? {})) {
    const pasta = nomeDaChave(chave);
    if (pasta && entrada.name && entrada.name !== pasta) apelidos.add(`${pasta}\0${entrada.name}`);
  }
  return apelidos;
}

export interface Lockfile {
  lockfileVersion?: number;
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
/** "node_modules/a/node_modules/b" → "node_modules/a"; null no primeiro nível. */
function chaveDoPai(chave: string): string | null {
  const posicao = chave.lastIndexOf("/node_modules/");
  return posicao === -1 ? null : chave.slice(0, posicao);
}

/**
 * A marca inBundle vem do próprio lockfile; o npm não confia nela, e nós também não. Ela só vale
 * para uma entrada sem resolved nem integrity (senão o npm a baixaria) cujo ancestral mais
 * próximo fora do bundle declare bundleDependencies (esse ancestral passa pela conferência
 * normal, e a integridade dele cobre o que vem dentro).
 */
function problemaDoBundle(lock: Lockfile, chave: string, entrada: EntradaDoLock): string | null {
  if (entrada.resolved || entrada.integrity) return `${chave}: marcada como inBundle, mas traz resolved ou integrity`;
  if (!entrada.version) return `${chave}: sem versão`;
  const nome = nomeDaChave(chave) ?? "";
  if (entrada.name !== undefined && entrada.name !== nome) {
    return `${chave}: marcada como inBundle, mas com name diferente da pasta: ${JSON.stringify(entrada.name)}`;
  }
  let pai = chaveDoPai(chave);
  while (pai && lock.packages[pai]?.inBundle) pai = chaveDoPai(pai);
  // Quem empacota é um pacote instalado (em node_modules/), nunca a raiz nem um workspace. Só lista
  // vale: com "true", o npm não trata a entrada como bundle e a baixaria sem integridade.
  const empacota = pai?.startsWith("node_modules/") ? lock.packages[pai]?.bundleDependencies : undefined;
  if (!Array.isArray(empacota) || empacota.length === 0) {
    return `${chave}: marcada como inBundle, mas nenhum pacote acima a empacota`;
  }
  // O nome está na lista de quem empacota, ou é dependência declarada de outra entrada do bundle
  // (o npm achata essas dependências sob quem empacota).
  if (empacota.includes(nome)) return null;
  const doBundle = `${pai ?? ""}/node_modules/`;
  const declarada = Object.entries(lock.packages).some(
    ([outra, dados]) => outra.startsWith(doBundle) && dados.inBundle && Object.hasOwn(dados.dependencies ?? {}, nome),
  );
  return declarada ? null : `${chave}: marcada como inBundle, mas ninguém no bundle a declara`;
}

/** "@fastify/cors", "11.4.3" → "https://registry.npmjs.org/@fastify/cors/-/cors-11.4.3.tgz" */
function tarballNoRegistro(nome: string, versao: string): string {
  const semEscopo = nome.slice(nome.lastIndexOf("/") + 1);
  return `${REGISTRO_DO_NPM}${nome}/-/${semEscopo}-${versao}.tgz`;
}

export function problemasDoLock(lock: Lockfile, confianca: Confianca = {}): string[] {
  // O lockfile vem de fora (de um PR): os tipos não garantem a forma dele.
  const pacotes = lock.packages as Lockfile["packages"] | undefined;
  if (!pacotes) return ['lockfile sem "packages"'];
  if (lock.lockfileVersion !== 3) return [`lockfileVersion ${String(lock.lockfileVersion)}: só o formato 3 é aceito`];
  const workspaces = new Set(pacotes[""]?.workspaces ?? []);
  const apelidos = apelidosConfiaveis(confianca);

  const problemas: string[] = [];
  for (const [chave, entrada] of Object.entries(pacotes)) {
    if (!nomeDaChave(chave)) {
      // Fora de node_modules/, só a raiz e os workspaces declarados nela (pastas exatas).
      if (chave !== "" && !workspaces.has(chave)) {
        problemas.push(`${chave}: fora de node_modules e não é um workspace declarado`);
      }
      continue;
    }
    if (entrada.link) continue;
    if (entrada.inBundle) {
      const problema = problemaDoBundle(lock, chave, entrada);
      if (problema) problemas.push(problema);
      continue;
    }
    if (!entrada.version) problemas.push(`${chave}: sem versão`);
    else if (!ehSemverEstrito(entrada.version)) {
      problemas.push(`${chave}: versão fora do semver estrito: ${entrada.version}`);
    }
    const pasta = nomeDaChave(chave) ?? "";
    const nome = entrada.name ?? pasta;
    if (!ehNomeDoNpm(nome)) problemas.push(`${chave}: name fora das regras do npm: ${JSON.stringify(nome)}`);
    else if (nome !== pasta && !apelidos.has(`${pasta}\0${nome}`)) {
      problemas.push(`${chave}: name "${nome}" diferente da pasta, e o apelido não está na base nem em allowAliases`);
    }
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
  } else if (Number.isNaN(info.publicadoEm.getTime())) {
    recusas.push("data de publicação inválida no registro do npm");
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
