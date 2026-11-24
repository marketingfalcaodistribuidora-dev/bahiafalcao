// Quem é proxy confiável para o x-request-id (spec 000, T008; CA3.1): IP único ou faixa (CIDR),
// IPv4 ou IPv6. Fora da lista, o id recebido é trocado por um gerado.
import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { geradorDeId } from "../../../src/plugins/request-id.js";

const pedido = (endereco: string, id: string) =>
  ({ headers: { "x-request-id": id }, socket: { remoteAddress: endereco } }) as unknown as IncomingMessage;

describe("geradorDeId", () => {
  it("aceita o id vindo de um proxy confiável dado como IP único", () => {
    expect(geradorDeId(["10.0.0.1"])(pedido("10.0.0.1", "caddy-1"))).toBe("caddy-1");
  });

  it("aceita o id vindo de um proxy confiável em IPv6", () => {
    expect(geradorDeId(["::1"])(pedido("::1", "caddy-2"))).toBe("caddy-2");
    expect(geradorDeId(["fd00::/8"])(pedido("fd12::5", "caddy-3"))).toBe("caddy-3");
  });

  it("troca o id vindo de um endereço vizinho, fora da lista", () => {
    expect(geradorDeId(["10.0.0.1"])(pedido("10.0.0.2", "forjado"))).not.toBe("forjado");
  });

  it("troca o id quando a conexão não informa o endereço", () => {
    const semEndereco = { headers: { "x-request-id": "forjado" }, socket: {} } as unknown as IncomingMessage;

    expect(geradorDeId(["10.0.0.1"])(semEndereco)).not.toBe("forjado");
  });
});
