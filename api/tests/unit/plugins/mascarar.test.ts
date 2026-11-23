// Mascarador dos logs (spec 000, T008; CA3.2): esconde senha, token, cookie e authorization em
// qualquer nível dos objetos que a API registra, sem estragar o que não é objeto simples (a
// requisição do Fastify, que os serializadores tratam por lista permitida).
import { describe, expect, it } from "vitest";
import { mascarar } from "../../../src/plugins/logs.js";

describe("mascarar", () => {
  it("esconde as chaves sensíveis em qualquer nível, mantendo o resto", () => {
    const registro = { usuario: { nome: "Ana", senhaAtual: "s", acessos: [{ tokenDeConvite: "t", ok: true }] } };

    expect(mascarar(registro)).toEqual({
      usuario: { nome: "Ana", senhaAtual: "[ESCONDIDO]", acessos: [{ tokenDeConvite: "[ESCONDIDO]", ok: true }] },
    });
  });

  it("reconhece as chaves sem diferenciar maiúsculas (Authorization, Set-Cookie)", () => {
    expect(mascarar({ Authorization: "Bearer x", "Set-Cookie": "a=b" })).toEqual({
      Authorization: "[ESCONDIDO]",
      "Set-Cookie": "[ESCONDIDO]",
    });
  });

  it("não copia instâncias de classe (a requisição do Fastify segue inteira para o serializador)", () => {
    class Pedido {
      readonly url = "/rota?x=1";
    }
    const pedido = new Pedido();

    expect((mascarar({ req: pedido }) as { req: unknown }).req).toBe(pedido);
  });

  it("aguenta referência circular", () => {
    const circular: Record<string, unknown> = { nome: "a" };
    circular["eu"] = circular;

    expect(mascarar(circular)).toEqual({ nome: "a", eu: "[referência circular]" });
  });
});
