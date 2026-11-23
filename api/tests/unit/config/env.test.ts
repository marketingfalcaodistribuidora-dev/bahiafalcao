// Configuração da API (spec 000, T006): CA1.1, CA4.6 e CA4.7, e as regras do plano §3.
// Com qualquer variável faltando ou inválida, a API não sobe, e a mensagem diz o NOME da
// variável, nunca o valor (que pode ser uma senha). Na dúvida, o padrão é o mais fechado.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ErroDeConfiguracao, lerConfiguracao, VARIAVEIS_DA_API } from "../../../src/config/env.js";

const minimo = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://api:senha-de-exemplo@127.0.0.1:5432/falcao",
};

/** O erro lançado por lerConfiguracao, para conferir a mensagem. */
function erroAoLer(env: Record<string, string | undefined>): ErroDeConfiguracao {
  try {
    lerConfiguracao(env);
  } catch (erro) {
    if (erro instanceof ErroDeConfiguracao) return erro;
    throw erro;
  }
  throw new Error("lerConfiguracao deveria ter recusado a configuração");
}

describe("configuração válida", () => {
  it("aceita o mínimo e usa os padrões mais fechados no resto", () => {
    expect(lerConfiguracao(minimo)).toEqual({
      ambiente: "production",
      urlDoBanco: minimo.DATABASE_URL,
      origensDoCors: [],
      proxiesConfiaveis: [],
      limiteGeralPorMinuto: 300,
      ipsForaDoLimite: [],
      docsHabilitado: false,
      nivelDoLog: "info",
    });
  });

  it("lê listas separadas por vírgula, ignorando espaços", () => {
    const configuracao = lerConfiguracao({
      ...minimo,
      CORS_ORIGENS: "https://bahiafalcao.com.br, https://www.bahiafalcao.com.br",
      TRUST_PROXY: "10.0.0.1, 172.16.0.0/12, ::1",
    });

    expect(configuracao.origensDoCors).toEqual(["https://bahiafalcao.com.br", "https://www.bahiafalcao.com.br"]);
    expect(configuracao.proxiesConfiaveis).toEqual(["10.0.0.1", "172.16.0.0/12", "::1"]);
  });

  it("ignora variáveis que a API não conhece (ex.: as do docker-compose)", () => {
    expect(() => lerConfiguracao({ ...minimo, POSTGRES_SENHA: "x", PATH: "/usr/bin" })).not.toThrow();
  });
});

describe("configuração inválida: a API não sobe (CA1.1)", () => {
  it("recusa a falta de NODE_ENV e de DATABASE_URL, citando as duas", () => {
    const erro = erroAoLer({});

    expect(erro.variaveis).toEqual(["NODE_ENV", "DATABASE_URL"]);
  });

  it("recusa NODE_ENV fora da lista", () => {
    expect(erroAoLer({ ...minimo, NODE_ENV: "producao" }).variaveis).toEqual(["NODE_ENV"]);
  });

  it("recusa DATABASE_URL que não é PostgreSQL", () => {
    expect(erroAoLer({ ...minimo, DATABASE_URL: "mysql://u:p@h/b" }).variaveis).toEqual(["DATABASE_URL"]);
  });

  it("a mensagem cita o nome da variável e nunca o valor", () => {
    const urlComSenha = "postgresql//api:SenhaSecreta123@h/b";

    const erro = erroAoLer({ ...minimo, DATABASE_URL: urlComSenha });

    expect(erro.message).toContain("DATABASE_URL");
    expect(erro.message).not.toContain("SenhaSecreta123");
  });

  it("recusa limite geral fora de 10 a 10000", () => {
    expect(erroAoLer({ ...minimo, LIMITE_GERAL_POR_MIN: "5" }).variaveis).toEqual(["LIMITE_GERAL_POR_MIN"]);
    expect(erroAoLer({ ...minimo, LIMITE_GERAL_POR_MIN: "abc" }).variaveis).toEqual(["LIMITE_GERAL_POR_MIN"]);
  });

  it("recusa nível de log desconhecido", () => {
    expect(erroAoLer({ ...minimo, LOG_NIVEL: "verbose" }).variaveis).toEqual(["LOG_NIVEL"]);
  });
});

describe("CORS (CA4.6)", () => {
  it.each(["*", "null", "http://bahiafalcao.com.br", "https://bahiafalcao.com.br/", "https://Bahiafalcao.com.br"])(
    "recusa a origem %s",
    (origem) => {
      expect(erroAoLer({ ...minimo, CORS_ORIGENS: origem }).variaveis).toEqual(["CORS_ORIGENS"]);
    },
  );

  it("aceita http://localhost só em desenvolvimento", () => {
    const local = { DATABASE_URL: minimo.DATABASE_URL, CORS_ORIGENS: "http://localhost:3000" };

    expect(lerConfiguracao({ ...local, NODE_ENV: "development" }).origensDoCors).toEqual(["http://localhost:3000"]);
    expect(erroAoLer({ ...local, NODE_ENV: "production" }).variaveis).toEqual(["CORS_ORIGENS"]);
    expect(erroAoLer({ ...local, NODE_ENV: "test" }).variaveis).toEqual(["CORS_ORIGENS"]);
  });
});

describe("proxy confiável (CA4.5)", () => {
  it.each(["true", "1", "2", "qualquer", "10.0.0.1/40"])("recusa TRUST_PROXY=%s", (valor) => {
    expect(erroAoLer({ ...minimo, TRUST_PROXY: valor }).variaveis).toEqual(["TRUST_PROXY"]);
  });
});

describe("o que é proibido em produção (CA4.7 e D16)", () => {
  it("recusa IPs fora do limite em produção (só servem para medir performance)", () => {
    expect(erroAoLer({ ...minimo, LIMITE_IGNORAR_IPS: "127.0.0.1" }).variaveis).toEqual(["LIMITE_IGNORAR_IPS"]);
  });

  it("aceita IPs fora do limite fora de produção", () => {
    const desenvolvimento = { ...minimo, NODE_ENV: "development", LIMITE_IGNORAR_IPS: "127.0.0.1, ::1" };

    expect(lerConfiguracao(desenvolvimento).ipsForaDoLimite).toEqual(["127.0.0.1", "::1"]);
  });

  it("recusa /docs habilitado em produção (até a Fase 1 pô-lo atrás do login)", () => {
    expect(erroAoLer({ ...minimo, DOCS_HABILITADO: "true" }).variaveis).toEqual(["DOCS_HABILITADO"]);
  });
});

describe("api/.env.example", () => {
  it("documenta todas as variáveis que a API lê", () => {
    const exemplo = readFileSync(new URL("../../../.env.example", import.meta.url), "utf8");
    const documentadas = [...exemplo.matchAll(/^([A-Z_]+)=/gm)].map((m) => m[1]);

    expect(documentadas).toEqual(expect.arrayContaining([...VARIAVEIS_DA_API]));
  });
});
