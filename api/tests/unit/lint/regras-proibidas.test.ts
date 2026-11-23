// CA4.4 (spec 000): o lint barra o que o api/CLAUDE.md proíbe no código da API, inclusive
// as formas de escrever que tentam escapar da regra (colchetes, apelidos, comentários que
// desligam o lint). Cada caso passa um trecho pelo ESLint com a configuração real do projeto,
// como um arquivo virtual (não existe no disco), e confere o erro que o recusa. O banco dos
// exemplos é declarado sem o nome proibido, para só o uso poder disparar a regra.
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const pastaDaApi = fileURLToPath(new URL("../../../", import.meta.url));
const eslint = new ESLint({ cwd: pastaDaApi });

interface Recusa {
  regra: string;
  mensagem: string;
}

async function recusas(codigo: string): Promise<Recusa[]> {
  const [resultado] = await eslint.lintText(codigo, { filePath: `${pastaDaApi}tests/unit/lint/exemplo-virtual.ts` });
  return (resultado?.messages ?? [])
    .filter((m) => m.severity === 2)
    .map((m) => ({ regra: m.ruleId ?? "erro-de-sintaxe", mensagem: m.message }));
}

async function regrasQueRecusam(codigo: string): Promise<string[]> {
  return (await recusas(codigo)).map((r) => r.regra);
}

async function mensagensQueRecusam(codigo: string): Promise<string> {
  return (await recusas(codigo)).map((r) => r.mensagem).join("\n");
}

// Montar o programa do TypeScript leva ~2 s; fica fora do tempo do primeiro caso.
beforeAll(async () => {
  await eslint.lintText("", { filePath: `${pastaDaApi}tests/unit/lint/exemplo-virtual.ts` });
});

describe("lint da API (CA4.4)", () => {
  it("aceita código comum, sem nada proibido", async () => {
    const codigo = "export function somar(a: number, b: number): number {\n  return a + b;\n}\n";

    expect(await regrasQueRecusam(codigo)).toEqual([]);
  });

  it("recusa any", async () => {
    const codigo = "export const valor: any = 1;\n";

    expect(await regrasQueRecusam(codigo)).toContain("@typescript-eslint/no-explicit-any");
  });

  it("recusa eval", async () => {
    const codigo = "eval('1 + 1');\n";

    expect(await regrasQueRecusam(codigo)).toContain("no-eval");
  });

  it("recusa new Function", async () => {
    const codigo = "export const f = new Function('return 1');\n";

    expect(await regrasQueRecusam(codigo)).toContain("no-new-func");
  });

  it("recusa @ts-ignore sem justificativa escrita", async () => {
    const codigo = "// @ts-ignore\nexport const n: number = 'texto';\n";

    expect(await regrasQueRecusam(codigo)).toContain("@typescript-eslint/ban-ts-comment");
  });

  it("aceita @ts-expect-error com justificativa escrita", async () => {
    const codigo =
      "// @ts-expect-error: o valor chega como texto de propósito neste exemplo\nexport const n: number = 'texto';\n";

    expect(await regrasQueRecusam(codigo)).not.toContain("@typescript-eslint/ban-ts-comment");
  });
});

describe("SQL montado com texto (CA4.4)", () => {
  it("recusa $queryRawUnsafe", async () => {
    const codigo =
      "declare const banco: Record<string, (sql: string) => unknown>;\nbanco.$queryRawUnsafe('SELECT 1');\n";

    expect(await mensagensQueRecusam(codigo)).toContain("$queryRaw com template");
  });

  it("recusa $executeRawUnsafe", async () => {
    const codigo =
      "declare const banco: Record<string, (sql: string) => unknown>;\nbanco.$executeRawUnsafe('DELETE FROM x');\n";

    expect(await mensagensQueRecusam(codigo)).toContain("$executeRaw com template");
  });

  it("recusa $queryRawUnsafe chamado com colchetes", async () => {
    const codigo =
      "declare const banco: Record<string, (sql: string) => unknown>;\nbanco['$queryRawUnsafe']('SELECT 1');\n";

    expect(await mensagensQueRecusam(codigo)).toContain("$queryRaw com template");
  });

  it("recusa $queryRawUnsafe guardado numa constante", async () => {
    const codigo =
      "declare const banco: Record<string, (sql: string) => unknown>;\nconst nome = '$queryRawUnsafe' as const;\nbanco[nome]('SELECT 1');\n";

    expect(await mensagensQueRecusam(codigo)).toContain("$queryRaw com template");
  });

  it("recusa $queryRawUnsafe escrito em texto de template", async () => {
    const codigo =
      "declare const banco: Record<string, (sql: string) => unknown>;\nbanco[`$queryRawUnsafe`]('SELECT 1');\n";

    expect(await mensagensQueRecusam(codigo)).toContain("$queryRaw com template");
  });

  it("recusa $executeRawUnsafe tirado por desestruturação", async () => {
    const codigo =
      "declare const banco: Record<string, (sql: string) => unknown>;\nexport const { $executeRawUnsafe: executar } = banco;\n";

    expect(await mensagensQueRecusam(codigo)).toContain("$executeRaw com template");
  });

  it("recusa Prisma.raw", async () => {
    const codigo = "declare const Prisma: { raw(sql: string): unknown };\nPrisma.raw('1 = 1');\n";

    expect(await mensagensQueRecusam(codigo)).toContain("Prisma.raw");
  });

  it("recusa Prisma.raw chamado com colchetes", async () => {
    const codigo = "declare const Prisma: { raw(sql: string): unknown };\nPrisma['raw']('1 = 1');\n";

    expect(await mensagensQueRecusam(codigo)).toContain("Prisma.raw");
  });

  it("recusa importar o Prisma com outro nome (apelido esconderia o Prisma.raw)", async () => {
    const codigo = "import { Prisma as P } from '@prisma/client';\nexport const p = P;\n";

    expect(await mensagensQueRecusam(codigo)).toContain("com o próprio nome");
  });

  it("recusa importar o raw do runtime do Prisma", async () => {
    const codigo = "import { raw } from '@prisma/client/runtime/library';\nexport const r = raw;\n";

    expect(await regrasQueRecusam(codigo)).toContain("no-restricted-imports");
  });
});

describe("comentários que desligam o lint (CA4.4)", () => {
  it("um eslint-disable não libera o que é proibido", async () => {
    const codigo = "// eslint-disable-next-line no-eval\neval('1 + 1');\n";

    expect(await regrasQueRecusam(codigo)).toContain("no-eval");
  });

  it("um eslint-disable para o arquivo inteiro também não libera", async () => {
    const codigo = "/* eslint-disable */\nexport const valor: any = 1;\n";

    expect(await regrasQueRecusam(codigo)).toContain("@typescript-eslint/no-explicit-any");
  });
});
