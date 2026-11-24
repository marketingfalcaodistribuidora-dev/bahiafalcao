// Rastreabilidade e logs (spec 000, T008; CA3.1 e CA3.2; RN4): toda resposta leva um
// x-request-id; os logs têm método, rota sem query, status, tempo e o id, e nunca senha,
// token, cookie, authorization ou query string, nem em campos aninhados.
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { appDeTeste, ROTA_PUBLICA_DE_TESTE } from "./apoio-app.js";

let app: FastifyInstance | undefined;
afterEach(() => app?.close());

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("x-request-id (CA3.1)", () => {
  it("sem o cabeçalho, a resposta traz um id gerado", async () => {
    ({ app } = await appDeTeste());

    const resposta = await app.inject({ method: "GET", url: "/nao-existe" });

    expect(resposta.headers["x-request-id"]).toMatch(UUID);
  });

  it("de quem não é proxy confiável, o id enviado é trocado por um gerado", async () => {
    ({ app } = await appDeTeste({ proxiesConfiaveis: [] }));

    const resposta = await app.inject({ method: "GET", url: "/nao-existe", headers: { "x-request-id": "forjado-1" } });

    expect(resposta.headers["x-request-id"]).toMatch(UUID);
  });

  it("do proxy confiável, um id válido é mantido", async () => {
    ({ app } = await appDeTeste({ proxiesConfiaveis: ["10.0.0.0/8"] }));

    const resposta = await app.inject({
      method: "GET",
      url: "/nao-existe",
      remoteAddress: "10.1.2.3",
      headers: { "x-request-id": "caddy-7f3a.42" },
    });

    expect(resposta.headers["x-request-id"]).toBe("caddy-7f3a.42");
  });

  it("do proxy confiável, um id inválido (caracteres ou tamanho) é trocado", async () => {
    ({ app } = await appDeTeste({ proxiesConfiaveis: ["10.0.0.0/8"] }));

    const comEspaco = await app.inject({
      method: "GET",
      url: "/nao-existe",
      remoteAddress: "10.1.2.3",
      headers: { "x-request-id": "id com espaço" },
    });
    const longo = await app.inject({
      method: "GET",
      url: "/nao-existe",
      remoteAddress: "10.1.2.3",
      headers: { "x-request-id": "a".repeat(129) },
    });

    expect(comEspaco.headers["x-request-id"]).toMatch(UUID);
    expect(longo.headers["x-request-id"]).toMatch(UUID);
  });
});

describe("logs sem dados sensíveis (CA3.2)", () => {
  it("registram método, rota sem query, status e o id, e nada dos cabeçalhos sensíveis", async () => {
    const teste = await appDeTeste();
    app = teste.app;

    const resposta = await app.inject({
      method: "GET",
      url: "/nao-existe?token=SEGREDO-DA-QUERY",
      headers: { authorization: "Bearer SEGREDO-DO-TOKEN", cookie: "sessao=SEGREDO-DO-COOKIE" },
    });

    const log = teste.log();
    expect(log).toContain('"rota":"/nao-existe"');
    expect(log).toContain('"metodo":"GET"');
    expect(log).toContain('"status":404');
    expect(log).toContain(String(resposta.headers["x-request-id"]));
    expect(log).not.toMatch(/SEGREDO-DA-QUERY|SEGREDO-DO-TOKEN|SEGREDO-DO-COOKIE/);
  });

  it("registram o molde da rota, e não o caminho com os valores (que podem ser tokens)", async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/convite/:token", ROTA_PUBLICA_DE_TESTE, () => ({ ok: true }));

    await app.inject({ method: "GET", url: "/teste/convite/SEGREDO-NO-CAMINHO" });

    const log = teste.log();
    expect(log).toContain('"rota":"/teste/convite/:token"');
    expect(log).not.toContain("SEGREDO-NO-CAMINHO");
  });

  it("o set-cookie da resposta não vai para o log", async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/sessao", ROTA_PUBLICA_DE_TESTE, (_pedido, resposta) => {
      void resposta.header("set-cookie", "__Host-sessao=SEGREDO-DA-SESSAO; HttpOnly");
      return { ok: true };
    });

    await app.inject({ method: "GET", url: "/teste/sessao" });

    expect(teste.log()).not.toContain("SEGREDO-DA-SESSAO");
  });

  it("o que a própria API registra é mascarado em qualquer nível (senha, token, cookie, authorization)", async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/registro", ROTA_PUBLICA_DE_TESTE, (pedido) => {
      pedido.log.info(
        { dados: { usuario: { nome: "Ana", senhaAtual: "SEGREDO-1", acesso: { tokenDeConvite: "SEGREDO-2" } } } },
        "cadastro",
      );
      return { ok: true };
    });

    await app.inject({ method: "GET", url: "/teste/registro" });

    const log = teste.log();
    expect(log).toContain("Ana");
    expect(log).not.toMatch(/SEGREDO-1|SEGREDO-2/);
  });

  it("um erro inesperado é registrado com o tipo e o id, sem a mensagem (que pode ter dados)", async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/quebra", ROTA_PUBLICA_DE_TESTE, () => {
      throw new TypeError("falhou para o e-mail ana@exemplo.com");
    });

    const resposta = await app.inject({ method: "GET", url: "/teste/quebra" });

    const log = teste.log();
    expect(log).toContain('"tipo":"TypeError"');
    expect(log).toContain(String(resposta.headers["x-request-id"]));
    expect(log).not.toContain("ana@exemplo.com");
  });

  it("nem uma mensagem de várias linhas (como as do Prisma, que listam os argumentos) vai para o log", async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/quebra-longa", ROTA_PUBLICA_DE_TESTE, () => {
      throw new Error("Argumento inválido em create:\n  email: 'ana@exemplo.com'\n  senhaHash: 'hash-secreto'");
    });

    await app.inject({ method: "GET", url: "/teste/quebra-longa" });

    const log = teste.log();
    expect(log).toContain('"tipo":"Error"');
    expect(log).not.toMatch(/ana@exemplo\.com|hash-secreto/);
  });

  it('nem uma linha da mensagem disfarçada de linha da pilha (começando com "at") vai para o log', async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/quebra-disfarcada", ROTA_PUBLICA_DE_TESTE, () => {
      throw new Error("falhou para:\n    at ana@exemplo.com (dados.ts:1:1)");
    });

    await app.inject({ method: "GET", url: "/teste/quebra-disfarcada" });

    expect(teste.log()).not.toContain("ana@exemplo.com");
  });

  it("se o cabeçalho da pilha não bate com o erro (nome trocado depois), a pilha não vai para o log", async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/quebra-renomeada", ROTA_PUBLICA_DE_TESTE, () => {
      const erro = new Error("falhou para:" + String.fromCharCode(10) + "    at ana@exemplo.com (dados.ts:1:1)");
      // A pilha é montada na primeira leitura; depois disso, o nome trocado não entra nela.
      String(erro.stack);
      erro.name = "ErroRenomeado";
      throw erro;
    });

    await app.inject({ method: "GET", url: "/teste/quebra-renomeada" });

    const log = teste.log();
    expect(log).toContain('"tipo":"ErroRenomeado"');
    expect(log).toContain('"pilhaDescartada":true');
    expect(log).not.toContain("ana@exemplo.com");
  });

  it("no caso comum, a pilha (as linhas at) vai para o log, para o diagnóstico", async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/quebra-comum", ROTA_PUBLICA_DE_TESTE, () => {
      throw new TypeError("x");
    });

    await app.inject({ method: "GET", url: "/teste/quebra-comum" });

    const log = teste.log();
    expect(log).toMatch(/"pilha":"\s+at /);
    expect(log).not.toContain("pilhaDescartada");
  });

  it("um erro sem mensagem também vai para o log com a pilha", async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/quebra-sem-mensagem", ROTA_PUBLICA_DE_TESTE, () => {
      throw new Error();
    });

    await app.inject({ method: "GET", url: "/teste/quebra-sem-mensagem" });

    const log = teste.log();
    expect(log).toMatch(/"pilha":"\s+at /);
    expect(log).not.toContain("pilhaDescartada");
  });

  it("uma linha que imita a pilha sem posição no código (:linha:coluna) não vai para o log", async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/quebra-encurtada", ROTA_PUBLICA_DE_TESTE, () => {
      const erro = new Error("segredo" + String.fromCharCode(10) + "    at falso (fulano@exemplo.com)");
      // A pilha é montada na primeira leitura; depois, a mensagem encurtada ainda casa o cabeçalho.
      String(erro.stack);
      erro.message = "segredo";
      throw erro;
    });

    await app.inject({ method: "GET", url: "/teste/quebra-encurtada" });

    expect(teste.log()).not.toContain("fulano@exemplo.com");
  });

  it("um erro do banco não traduzido vai para o log com os códigos (não sensíveis), sem a mensagem", async () => {
    const teste = await appDeTeste();
    app = teste.app;
    app.get("/teste/quebra-no-banco", ROTA_PUBLICA_DE_TESTE, () => {
      throw new Prisma.PrismaClientKnownRequestError("tabela usuarios_secretos não existe", {
        code: "P2010",
        clientVersion: "7.10.1",
        meta: { driverAdapterError: { cause: { originalCode: "42P01", originalMessage: "usuarios_secretos" } } },
      });
    });

    await app.inject({ method: "GET", url: "/teste/quebra-no-banco" });

    const log = teste.log();
    expect(log).toContain('"codigo":"P2010"');
    expect(log).toContain('"codigoDoBanco":"42P01"');
    expect(log).not.toContain("usuarios_secretos");
  });
});
