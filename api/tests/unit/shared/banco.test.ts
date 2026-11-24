// Erro numa conexão ociosa do pool (spec 000, T007; CA1.3, a API segue de pé com o banco fora;
// achado do review-gate da fundação). Sem ouvinte, o pg
// lança o evento "error" como exceção e derruba o processo inteiro. O banco sempre ouve e avisa
// quem pediu, só com o pool e o tipo do erro (a mensagem pode ter dados).
// Não conecta: criar os pools e os clientes não abre conexão.
import { describe, expect, it, vi } from "vitest";
import { criarBanco } from "../../../src/shared/banco.js";

const URL_SEM_BANCO = "postgresql://ninguem:x@127.0.0.1:1/nada";

describe("erro numa conexão ociosa do pool", () => {
  it("não derruba o processo quando ninguém pediu aviso", async () => {
    const banco = criarBanco({ url: URL_SEM_BANCO });

    expect(() => banco.pools.publico.emit("error", new Error("conexão caiu"))).not.toThrow();
    await banco.fechar();
  });

  it("avisa com o pool e o tipo do erro, sem a mensagem", async () => {
    const aoErroNoPool = vi.fn();
    const banco = criarBanco({ url: URL_SEM_BANCO, aoErroNoPool });

    banco.pools.administracao.emit("error", new TypeError("detalhe com ana@exemplo.com"));

    expect(aoErroNoPool).toHaveBeenCalledExactlyOnceWith({ pool: "administracao", tipo: "TypeError" });
    await banco.fechar();
  });
});
