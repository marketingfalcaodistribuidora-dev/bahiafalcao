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
