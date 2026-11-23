// Rastreabilidade e logs (spec 000, T008; CA3.1 e CA3.2; RN4): toda resposta leva um
// x-request-id; os logs têm método, rota sem query, status, tempo e o id, e nunca senha,
// token, cookie, authorization ou query string, nem em campos aninhados.
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
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
});
