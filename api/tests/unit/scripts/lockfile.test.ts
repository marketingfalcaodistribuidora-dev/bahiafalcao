// Regras do check-lock (spec 000, CA7.1; plano §8 e §9): pacotes novos ou alterados num
// lockfile passam pelo mesmo protocolo dos diretos: idade mínima de 7 dias, sem falha alta ou
// crítica na OSV (moderada vira aviso), vindos do registro do npm e sem script de instalação
// fora do allowScripts. Antes disso, o lockfile inteiro é conferido sem rede: tudo vem do
// registro do npm, com integridade sha512 (plano §9; achado Alto do review-gate da fundação).
import { describe, expect, it } from "vitest";
import {
  avaliarPacote,
  pacotesNovosOuAlterados,
  problemasDoLock,
  type InfoDoPacote,
  type Lockfile,
} from "../../../scripts/lockfile.js";

const REGISTRO = "https://registry.npmjs.org";
const AGORA = new Date("2026-11-23T12:00:00Z");

const INTEGRIDADE = "sha512-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
const OUTRA_INTEGRIDADE =
  "sha512-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB==";

const lock = (pacotes: Lockfile["packages"]): Lockfile => ({
  lockfileVersion: 3,
  packages: { "": { name: "raiz", workspaces: ["api"] }, ...pacotes },
});

describe("problemasDoLock (conferência do lockfile inteiro, sem rede)", () => {
  it("aceita um lockfile em que tudo vem do registro do npm com integridade sha512", () => {
    const tudoCerto = lock({
      api: { name: "@falcao/api", version: "0.1.0" },
      "node_modules/@falcao/api": { resolved: "api", link: true },
      "node_modules/zod": { version: "4.6.7", resolved: `${REGISTRO}/zod/-/zod-4.6.7.tgz`, integrity: INTEGRIDADE },
      "node_modules/npm": {
        version: "11.20.0",
        resolved: `${REGISTRO}/npm/-/npm-11.20.0.tgz`,
        integrity: INTEGRIDADE,
        bundleDependencies: ["abbrev"],
      },
      "node_modules/npm/node_modules/abbrev": { version: "3.0.1", inBundle: true },
    });

    expect(problemasDoLock(tudoCerto)).toEqual([]);
  });

  it("recusa pacote que vem de fora do registro do npm, mesmo que não seja novo", () => {
    const deFora = lock({
      "node_modules/zod": { version: "4.6.7", resolved: "https://exemplo.com/zod-4.6.7.tgz", integrity: INTEGRIDADE },
    });

    expect(problemasDoLock(deFora)).toEqual(["node_modules/zod: não vem do registro do npm"]);
  });

  it("recusa o tarball de OUTRO pacote do próprio registro, mesmo com a integridade verdadeira dele", () => {
    const trocado = lock({
      "node_modules/zod": {
        version: "4.6.7",
        resolved: `${REGISTRO}/is-number/-/is-number-7.0.0.tgz`,
        integrity: INTEGRIDADE,
      },
    });

    expect(problemasDoLock(trocado)).toEqual([
      `node_modules/zod: aponta para outro tarball (o de zod@4.6.7 é ${REGISTRO}/zod/-/zod-4.6.7.tgz)`,
    ]);
  });

  it("recusa o tarball de outra versão do mesmo pacote (escaparia da idade mínima)", () => {
    const outraVersao = lock({
      "node_modules/zod": { version: "4.6.7", resolved: `${REGISTRO}/zod/-/zod-4.6.8.tgz`, integrity: INTEGRIDADE },
    });

    expect(problemasDoLock(outraVersao)).toEqual([
      `node_modules/zod: aponta para outro tarball (o de zod@4.6.7 é ${REGISTRO}/zod/-/zod-4.6.7.tgz)`,
    ]);
  });

  it("aceita o tarball de pacote com escopo e de pacote instalado com apelido (npm:nome@versão)", () => {
    const certos = lock({
      "node_modules/@fastify/cors": {
        version: "11.4.3",
        resolved: `${REGISTRO}/@fastify/cors/-/cors-11.4.3.tgz`,
        integrity: INTEGRIDADE,
      },
      "node_modules/string-width-cjs": {
        name: "string-width",
        version: "4.2.3",
        resolved: `${REGISTRO}/string-width/-/string-width-4.2.3.tgz`,
        integrity: INTEGRIDADE,
      },
    });

    expect(problemasDoLock(certos)).toEqual([]);
  });

  it("recusa pacote sem integridade ou com integridade que não é sha512", () => {
    const fracos = lock({
      "node_modules/zod": { version: "4.6.7", resolved: `${REGISTRO}/zod/-/zod-4.6.7.tgz` },
      "node_modules/pg": { version: "8.23.1", resolved: `${REGISTRO}/pg/-/pg-8.23.1.tgz`, integrity: "sha1-abc=" },
    });

    expect(problemasDoLock(fracos)).toEqual([
      "node_modules/zod: sem integridade sha512",
      "node_modules/pg: sem integridade sha512",
    ]);
  });

  describe("marca inBundle (pacote que vem dentro do tarball de outro)", () => {
    const empacotador = {
      version: "4.3.5",
      resolved: `${REGISTRO}/empacota/-/empacota-4.3.5.tgz`,
      integrity: INTEGRIDADE,
      bundleDependencies: ["a"],
    };

    it("aceita a dependência empacotada e as dependências dela, sem resolved nem integridade", () => {
      const comBundle = lock({
        "node_modules/empacota": empacotador,
        "node_modules/empacota/node_modules/a": { version: "1.0.0", inBundle: true },
        "node_modules/empacota/node_modules/a/node_modules/b": { version: "2.0.0", inBundle: true },
      });

      expect(problemasDoLock(comBundle)).toEqual([]);
    });

    it("recusa a marca numa entrada de primeiro nível, que nenhum pacote empacota", () => {
      const falsa = lock({ "node_modules/zod": { version: "4.6.7", inBundle: true } });

      expect(problemasDoLock(falsa)).toEqual([
        "node_modules/zod: marcada como inBundle, mas nenhum pacote acima a empacota",
      ]);
    });

    it("recusa a marca sob um pacote que não declara bundleDependencies", () => {
      const semDeclarar = lock({
        "node_modules/comum": {
          version: "1.0.0",
          resolved: `${REGISTRO}/comum/-/comum-1.0.0.tgz`,
          integrity: INTEGRIDADE,
        },
        "node_modules/comum/node_modules/zod": { version: "4.6.7", inBundle: true },
      });

      expect(problemasDoLock(semDeclarar)).toEqual([
        "node_modules/comum/node_modules/zod: marcada como inBundle, mas nenhum pacote acima a empacota",
      ]);
    });

    it("recusa a marca numa entrada que traz resolved (ela seria baixada, sem conferência)", () => {
      const baixavel = lock({
        "node_modules/empacota": empacotador,
        "node_modules/empacota/node_modules/a": {
          version: "1.0.0",
          inBundle: true,
          resolved: `${REGISTRO}/a/-/a-1.0.0.tgz`,
        },
      });

      expect(problemasDoLock(baixavel)).toEqual([
        "node_modules/empacota/node_modules/a: marcada como inBundle, mas traz resolved ou integrity",
      ]);
    });
  });

  it("recusa chave fora de node_modules que não é a raiz nem um workspace declarado", () => {
    const intrusa = lock({ "outro/lugar": { version: "1.0.0" } });

    expect(problemasDoLock(intrusa)).toEqual(["outro/lugar: fora de node_modules e não é um workspace declarado"]);
  });

  it("recusa lockfile em outro formato que não o 3", () => {
    const antigo = { ...lock({}), lockfileVersion: 2 };

    expect(problemasDoLock(antigo)).toEqual(["lockfileVersion 2: só o formato 3 é aceito"]);
  });

  it('recusa lockfile sem "packages", com uma mensagem clara', () => {
    const semPacotes = { lockfileVersion: 3 } as unknown as Lockfile;

    expect(problemasDoLock(semPacotes)).toEqual(['lockfile sem "packages"']);
  });

  it("recusa entrada de dependência sem versão", () => {
    const semVersao = lock({
      "node_modules/zod": { resolved: `${REGISTRO}/zod/-/zod-4.6.7.tgz`, integrity: INTEGRIDADE },
    });

    expect(problemasDoLock(semVersao)).toEqual(["node_modules/zod: sem versão"]);
  });
});

describe("pacotesNovosOuAlterados", () => {
  it("devolve só o que não existia no lockfile anterior, na mesma versão", () => {
    const base = lock({
      "node_modules/fastify": { version: "5.12.8", resolved: `${REGISTRO}/fastify/-/fastify-5.12.8.tgz` },
      "node_modules/zod": { version: "4.6.6", resolved: `${REGISTRO}/zod/-/zod-4.6.6.tgz` },
    });
    const novo = lock({
      "node_modules/fastify": { version: "5.12.8", resolved: `${REGISTRO}/fastify/-/fastify-5.12.8.tgz` },
      "node_modules/zod": { version: "4.6.7", resolved: `${REGISTRO}/zod/-/zod-4.6.7.tgz` },
      "node_modules/pg": { version: "8.23.1", resolved: `${REGISTRO}/pg/-/pg-8.23.1.tgz` },
    });

    expect(pacotesNovosOuAlterados(base, novo).map((p) => `${p.nome}@${p.versao}`)).toEqual(["zod@4.6.7", "pg@8.23.1"]);
  });

  it("lê o nome de pacotes com escopo e de pacotes aninhados", () => {
    const novo = lock({
      "node_modules/@fastify/cors": { version: "11.4.3", resolved: `${REGISTRO}/@fastify/cors/-/cors-11.4.3.tgz` },
      "node_modules/a/node_modules/minimatch": {
        version: "9.0.5",
        resolved: `${REGISTRO}/minimatch/-/minimatch-9.0.5.tgz`,
      },
    });

    expect(pacotesNovosOuAlterados(lock({}), novo).map((p) => p.nome)).toEqual(["@fastify/cors", "minimatch"]);
  });

  it("usa o nome verdadeiro de um pacote instalado com apelido (npm:nome@versão)", () => {
    const novo = lock({
      "node_modules/string-width-cjs": {
        name: "string-width",
        version: "4.2.3",
        resolved: `${REGISTRO}/string-width/-/string-width-4.2.3.tgz`,
      },
    });

    expect(pacotesNovosOuAlterados(lock({}), novo).map((p) => `${p.nome}@${p.versao}`)).toEqual(["string-width@4.2.3"]);
  });

  it("trata como alterado o mesmo nome@versão vindo de outro endereço ou com outra integridade", () => {
    const original = { version: "4.6.7", resolved: `${REGISTRO}/zod/-/zod-4.6.7.tgz`, integrity: INTEGRIDADE };
    const base = lock({ "node_modules/zod": original });
    const outroEndereco = lock({
      "node_modules/zod": { ...original, resolved: `${REGISTRO}/zod-falso/-/zod-falso-4.6.7.tgz` },
    });
    const outraIntegridade = lock({ "node_modules/zod": { ...original, integrity: OUTRA_INTEGRIDADE } });

    expect(pacotesNovosOuAlterados(base, outroEndereco).map((p) => `${p.nome}@${p.versao}`)).toEqual(["zod@4.6.7"]);
    expect(pacotesNovosOuAlterados(base, outraIntegridade).map((p) => `${p.nome}@${p.versao}`)).toEqual(["zod@4.6.7"]);
  });

  it("ignora a raiz e os workspaces do próprio repositório", () => {
    const novo = lock({
      api: { name: "@falcao/api", version: "0.1.0" },
      "node_modules/@falcao/api": { resolved: "api", link: true },
    });

    expect(pacotesNovosOuAlterados(lock({}), novo)).toEqual([]);
  });
});

describe("avaliarPacote", () => {
  const pacote = {
    nome: "zod",
    versao: "4.6.7",
    resolved: `${REGISTRO}/zod/-/zod-4.6.7.tgz`,
    integrity: INTEGRIDADE,
    temScriptDeInstalacao: false,
  };
  const semAllowScripts = {};
  const aprovado = { recusas: [], avisos: [] };

  it("aprova pacote do registro, com 7 dias ou mais e sem falha conhecida", () => {
    const info = { publicadoEm: new Date("2026-11-16T11:00:00Z"), vulnerabilidades: [] };

    expect(avaliarPacote(pacote, info, AGORA, semAllowScripts)).toEqual(aprovado);
  });

  it("recusa versão publicada há menos de 7 dias", () => {
    const info = { publicadoEm: new Date("2026-11-20T12:00:00Z"), vulnerabilidades: [] };

    expect(avaliarPacote(pacote, info, AGORA, semAllowScripts).recusas).toEqual([
      "publicada há 3 dia(s): o mínimo é 7",
    ]);
  });

  it("recusa versão que o registro não conhece", () => {
    const info = { publicadoEm: undefined, vulnerabilidades: [] };

    expect(avaliarPacote(pacote, info, AGORA, semAllowScripts).recusas).toEqual([
      "versão não encontrada no registro do npm",
    ]);
  });

  it("recusa falha alta ou crítica conhecida na OSV", () => {
    const info: InfoDoPacote = {
      publicadoEm: new Date("2026-10-01T00:00:00Z"),
      vulnerabilidades: [
        { id: "GHSA-aaaa-bbbb-cccc", gravidade: "HIGH" },
        { id: "GHSA-dddd-eeee-ffff", gravidade: "CRITICAL" },
      ],
    };

    expect(avaliarPacote(pacote, info, AGORA, semAllowScripts).recusas).toEqual([
      "falha alta ou crítica na OSV: GHSA-aaaa-bbbb-cccc (HIGH), GHSA-dddd-eeee-ffff (CRITICAL)",
    ]);
  });

  it("recusa falha de gravidade desconhecida (precisa de conferência à mão)", () => {
    const info: InfoDoPacote = {
      publicadoEm: new Date("2026-10-01T00:00:00Z"),
      vulnerabilidades: [{ id: "OSV-2026-1", gravidade: "DESCONHECIDA" }],
    };

    expect(avaliarPacote(pacote, info, AGORA, semAllowScripts).recusas).toEqual([
      "falha de gravidade desconhecida na OSV: OSV-2026-1",
    ]);
  });

  it("só avisa de falha moderada ou baixa (o protocolo bloqueia alta e crítica)", () => {
    const info: InfoDoPacote = {
      publicadoEm: new Date("2026-10-01T00:00:00Z"),
      vulnerabilidades: [{ id: "GHSA-gggg-hhhh-iiii", gravidade: "MODERATE" }],
    };

    expect(avaliarPacote(pacote, info, AGORA, semAllowScripts)).toEqual({
      recusas: [],
      avisos: ["falha moderada ou baixa na OSV: GHSA-gggg-hhhh-iiii (MODERATE)"],
    });
  });

  it("recusa pacote que não vem do registro do npm (git, URL ou arquivo)", () => {
    const deFora = { ...pacote, resolved: "git+https://github.com/alguem/zod.git#abc123" };
    const info = { publicadoEm: new Date("2026-10-01T00:00:00Z"), vulnerabilidades: [] };

    expect(avaliarPacote(deFora, info, AGORA, semAllowScripts).recusas).toEqual(["não vem do registro do npm"]);
  });

  it("recusa script de instalação fora do allowScripts", () => {
    const comScript = { ...pacote, nome: "esbuild", versao: "0.27.0", temScriptDeInstalacao: true };
    const info = { publicadoEm: new Date("2026-10-01T00:00:00Z"), vulnerabilidades: [] };

    expect(avaliarPacote(comScript, info, AGORA, semAllowScripts).recusas).toEqual([
      "tem script de instalação e não está no allowScripts",
    ]);
  });

  it("aceita script de instalação quando o pacote está no allowScripts (liberado ou negado)", () => {
    const comScript = { ...pacote, nome: "prisma", versao: "7.10.1", temScriptDeInstalacao: true };
    const info = { publicadoEm: new Date("2026-10-15T00:00:00Z"), vulnerabilidades: [] };

    expect(avaliarPacote(comScript, info, AGORA, { "prisma@7.10.1": true })).toEqual(aprovado);
    expect(avaliarPacote({ ...comScript, nome: "esbuild" }, info, AGORA, { esbuild: false })).toEqual(aprovado);
  });
});
