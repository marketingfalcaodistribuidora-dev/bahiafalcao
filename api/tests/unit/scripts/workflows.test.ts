// Conferência dos workflows do GitHub (spec 000, CA7.6; review-gate da fundação, rodadas 2 e 3):
// toda action fixada por SHA, "permissions: contents: read" no topo, nenhuma permissão de escrita
// (em qualquer nível e em qualquer formato), todo checkout sem guardar credenciais e nenhum
// gatilho que rode código de fora com os segredos do repositório. Comentários não contam.
import { describe, expect, it } from "vitest";
import { problemasDoWorkflow } from "../../../scripts/workflows.js";

const SHA = "3d3c42e5aac5ba805825da76410c181273ba90b1";

/** Um workflow que cumpre todas as regras; cada teste muda só o que confere. */
const certo = `on:
  push:
permissions:
  contents: read
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@${SHA}
        with:
          persist-credentials: false
      - run: npm ci
`;

describe("problemasDoWorkflow", () => {
  it("aceita o workflow que cumpre todas as regras", () => {
    expect(problemasDoWorkflow("ci.yml", certo)).toEqual([]);
  });

  it("recusa action fixada por tag (uma tag pode ser movida para outro código)", () => {
    const porTag = certo.replace(`actions/checkout@${SHA}`, "actions/checkout@v4");

    expect(problemasDoWorkflow("ci.yml", porTag)).toEqual(["ci.yml:9: action sem SHA: actions/checkout@v4"]);
  });

  it('recusa workflow sem "permissions: contents: read" no topo', () => {
    const semPermissoes = certo.replace("permissions:\n  contents: read\n", "");

    expect(problemasDoWorkflow("ci.yml", semPermissoes)).toEqual(['ci.yml: sem "permissions: contents: read" no topo']);
  });

  it.each([
    ["no bloco do topo", "  contents: read\n", "  contents: read\n  id-token: write\n"],
    ["entre aspas simples", "  contents: read\n", "  contents: read\n  packages: 'write'\n"],
    ["entre aspas duplas", "  contents: read\n", '  contents: read\n  id-token: "write"\n'],
    ["no formato em chaves, num job", "    runs-on:", "    permissions: { contents: write }\n    runs-on:"],
    ["como write-all, num job", "    runs-on:", "    permissions: write-all\n    runs-on:"],
  ])("recusa permissão de escrita %s", (_caso, antes, depois) => {
    const comEscrita = certo.replace(antes, depois);

    expect(problemasDoWorkflow("ci.yml", comEscrita)).toHaveLength(1);
    expect(problemasDoWorkflow("ci.yml", comEscrita)[0]).toMatch(/^ci\.yml:\d+: permissão de escrita/);
  });

  it.each(["pull_request_target", "workflow_run"])("recusa o gatilho %s", (gatilho) => {
    const perigoso = certo.replace("  push:", `  ${gatilho}:`);

    expect(problemasDoWorkflow("ci.yml", perigoso)).toEqual([`ci.yml:2: gatilho proibido: ${gatilho}:`]);
  });

  it("recusa checkout que guarda credenciais", () => {
    const comCredenciais = certo.replace("        with:\n          persist-credentials: false\n", "");

    expect(problemasDoWorkflow("ci.yml", comCredenciais)).toEqual(["ci.yml: checkout sem persist-credentials: false"]);
  });

  it("não se deixa enganar por comentário (um persist-credentials: false comentado não conta)", () => {
    const comentado = certo.replace("          persist-credentials: false", "          # persist-credentials: false");

    expect(problemasDoWorkflow("ci.yml", comentado)).toEqual(["ci.yml: checkout sem persist-credentials: false"]);
  });

  it.each([
    ["em mapa inline", "      - uses: actions/checkout@" + SHA, "      - {uses: actions/checkout@v4}"],
    ["entre aspas", "      - uses: actions/checkout@" + SHA, '      - uses: "actions/checkout@v4"'],
  ])("recusa action sem SHA escrita %s", (_caso, antes, depois) => {
    const disfarcada = certo.replace(antes, depois);

    expect(problemasDoWorkflow("ci.yml", disfarcada)).toContainEqual(
      expect.stringMatching(/^ci\.yml:9: action sem SHA: actions\/checkout@v4$/),
    );
  });

  it("um # dentro de aspas não é comentário e não esconde o resto da linha", () => {
    const escondido = certo.replace("  push:", '  { push: {}, x: " #", pull_request_target: {} }');

    expect(problemasDoWorkflow("ci.yml", escondido)).toContainEqual(expect.stringMatching(/gatilho proibido/));
  });

  it("recusa escape de caractere (\\u ou \\x), que esconderia um nome proibido", () => {
    const comEscape = certo.replace("  push:", '  "workflow\\u005frun":');

    expect(problemasDoWorkflow("ci.yml", comEscape)).toEqual([
      'ci.yml:2: escape de caractere proibido: "workflow\\u005frun":',
    ]);
  });

  it("aceita comentário que só cita a escrita ou um gatilho proibido", () => {
    const comComentario = `# Nunca usar pull_request_target nem permissions: write-all aqui.\n${certo}`;

    expect(problemasDoWorkflow("ci.yml", comComentario)).toEqual([]);
  });
});
