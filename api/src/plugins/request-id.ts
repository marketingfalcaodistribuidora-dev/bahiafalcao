// Identificador de cada requisição (spec 000, T008; CA3.1). Vai no log e no cabeçalho
// x-request-id da resposta. Um x-request-id recebido só é aceito quando a conexão vem de um
// proxy confiável (TRUST_PROXY) e o valor é seguro (até 128 caracteres de [A-Za-z0-9._:-]).
// Fora disso, gera-se um UUID: um cliente qualquer não escolhe o id que aparece nos logs.
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { BlockList, isIP } from "node:net";

const ID_SEGURO = /^[A-Za-z0-9._:-]{1,128}$/;

/** As faixas de proxies confiáveis (IPs ou CIDR), para conferir o endereço da conexão. */
export function listaDeProxies(proxies: string[]): BlockList {
  const lista = new BlockList();
  for (const proxy of proxies) {
    const [ip = "", prefixo] = proxy.split("/");
    const tipo = isIP(ip) === 6 ? "ipv6" : "ipv4";
    if (prefixo === undefined) lista.addAddress(ip, tipo);
    else lista.addSubnet(ip, Number(prefixo), tipo);
  }
  return lista;
}

/** O `genReqId` do Fastify: aceita o id do proxy confiável ou gera um UUID. */
export function geradorDeId(proxies: string[]): (pedido: IncomingMessage) => string {
  const confiaveis = listaDeProxies(proxies);
  return (pedido) => {
    const recebido = pedido.headers["x-request-id"];
    const endereco = pedido.socket.remoteAddress ?? "";
    // Endereço vazio ou que não é IP: o check devolve false (conferido no Node 26).
    const doProxy = confiaveis.check(endereco, isIP(endereco) === 6 ? "ipv6" : "ipv4");
    return doProxy && typeof recebido === "string" && ID_SEGURO.test(recebido) ? recebido : randomUUID();
  };
}
