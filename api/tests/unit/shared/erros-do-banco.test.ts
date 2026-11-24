// Tradução dos erros do banco para erros de domínio (spec 000, T007; CA2.5, CA1.5).
// O resto da API nunca vê erro do Prisma nem do PostgreSQL: só ErroDeConflito,
// ErroIndisponivel ou o erro original (que vira 500 neutro na T008).
import { describe, expect, it } from "vitest";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { ErroDeConflito, ErroIndisponivel } from "../../../src/shared/erros.js";
import { traduzirErroDoBanco } from "../../../src/shared/erros-do-banco.js";

const erroDoPrisma = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError("mensagem interna do Prisma", {
    code,
    clientVersion: "7.10.1",
    ...(meta && { meta }),
  });

describe("traduzirErroDoBanco", () => {
  it("transforma P2002 (valor repetido) em ErroDeConflito, apontando os campos", () => {
    const traduzido = traduzirErroDoBanco(erroDoPrisma("P2002", { target: ["email"] }));

    expect(traduzido).toBeInstanceOf(ErroDeConflito);
    expect((traduzido as ErroDeConflito).campos).toEqual({ email: "Já existe um registro com este valor." });
  });

  it("transforma P2002 sem campos conhecidos em ErroDeConflito sem campos", () => {
    const traduzido = traduzirErroDoBanco(erroDoPrisma("P2002"));

    expect(traduzido).toBeInstanceOf(ErroDeConflito);
    expect((traduzido as ErroDeConflito).campos).toEqual({});
  });

  it("lê os campos do P2002 também no formato do adaptador do PostgreSQL (Prisma 7)", () => {
    const meta = {
      driverAdapterError: { cause: { kind: "UniqueConstraintViolation", constraint: { fields: ["email"] } } },
    };

    const traduzido = traduzirErroDoBanco(erroDoPrisma("P2002", meta));

    expect((traduzido as ErroDeConflito).campos).toEqual({ email: "Já existe um registro com este valor." });
  });

  it("transforma unicidade violada numa consulta SQL direta (P2010) em ErroDeConflito", () => {
    const meta = {
      driverAdapterError: {
        cause: {
          originalCode: "23505",
          kind: "UniqueConstraintViolation",
          constraint: { index: "contatos_email_key" },
        },
      },
    };

    const traduzido = traduzirErroDoBanco(erroDoPrisma("P2010", meta));

    expect(traduzido).toBeInstanceOf(ErroDeConflito);
    expect((traduzido as ErroDeConflito).campos).toEqual({});
  });

  it("não trata como conflito um P2010 que não é de unicidade", () => {
    const meta = { driverAdapterError: { cause: { originalCode: "42601", kind: "postgres" } } };
    const original = erroDoPrisma("P2010", meta);

    expect(traduzirErroDoBanco(original)).toBe(original);
  });

  it("transforma banco inalcançável numa consulta direta (P2010, DatabaseNotReachable) em ErroIndisponivel", () => {
    const meta = { driverAdapterError: { cause: { kind: "DatabaseNotReachable", host: "127.0.0.1", port: 1 } } };

    expect(traduzirErroDoBanco(erroDoPrisma("P2010", meta))).toBeInstanceOf(ErroIndisponivel);
  });

  it("transforma consulta cortada pelo limite de tempo (57014) em ErroIndisponivel", () => {
    const meta = { driverAdapterError: { cause: { originalCode: "57014", kind: "postgres" } } };

    expect(traduzirErroDoBanco(erroDoPrisma("P2010", meta))).toBeInstanceOf(ErroIndisponivel);
  });

  it.each(["P1001", "P1002"])(
    "transforma %s (banco inalcançável numa operação de modelo) em ErroIndisponivel",
    (code) => {
      expect(traduzirErroDoBanco(erroDoPrisma(code))).toBeInstanceOf(ErroIndisponivel);
    },
  );

  // Formatos do adaptador do PostgreSQL e do runtime do Prisma 7.10.1 para "o banco caiu, reiniciou
  // ou está cheio" (review-gate da fundação, rodada 2): todos são passageiros, e a resposta é 503.
  it.each(["P1008", "P1017", "P2037"])(
    "transforma %s (tempo esgotado, conexão fechada, conexões demais) em ErroIndisponivel",
    (code) => {
      expect(traduzirErroDoBanco(erroDoPrisma(code))).toBeInstanceOf(ErroIndisponivel);
    },
  );

  it.each(["ConnectionClosed", "SocketTimeout", "TooManyConnections"])(
    "transforma P2010 com kind %s em ErroIndisponivel",
    (kind) => {
      const meta = { driverAdapterError: { cause: { kind } } };

      expect(traduzirErroDoBanco(erroDoPrisma("P2010", meta))).toBeInstanceOf(ErroIndisponivel);
    },
  );

  it.each(["57P01", "57P02", "57P03", "53300", "08006", "08001"])(
    "transforma o código %s do PostgreSQL (banco desligando, reiniciando, cheio ou conexão perdida) em ErroIndisponivel",
    (originalCode) => {
      const meta = { driverAdapterError: { cause: { originalCode, kind: "postgres" } } };

      expect(traduzirErroDoBanco(erroDoPrisma("P2039", meta))).toBeInstanceOf(ErroIndisponivel);
    },
  );

  it.each(["Connection terminated unexpectedly", "Connection terminated due to connection timeout"])(
    'transforma o erro do pg "%s" em ErroIndisponivel',
    (mensagem) => {
      expect(traduzirErroDoBanco(new Error(mensagem))).toBeInstanceOf(ErroIndisponivel);
    },
  );

  it("transforma a falha ao iniciar a conexão em ErroIndisponivel", () => {
    const erro = new Prisma.PrismaClientInitializationError("Can't reach database server", "7.10.1");

    expect(traduzirErroDoBanco(erro)).toBeInstanceOf(ErroIndisponivel);
  });

  it("transforma a espera esgotada por uma conexão do pool em ErroIndisponivel", () => {
    const traduzido = traduzirErroDoBanco(new Error("timeout exceeded when trying to connect"));

    expect(traduzido).toBeInstanceOf(ErroIndisponivel);
  });

  it("não expõe a mensagem interna do Prisma", () => {
    const traduzido = traduzirErroDoBanco(erroDoPrisma("P2002", { target: ["email"] })) as Error;

    expect(traduzido.message).not.toContain("mensagem interna do Prisma");
  });

  it("devolve qualquer outro erro sem mudar (vira 500 neutro mais adiante)", () => {
    const outro = new TypeError("outro problema");

    expect(traduzirErroDoBanco(outro)).toBe(outro);
  });
});
