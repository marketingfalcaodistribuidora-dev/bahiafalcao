// Banco próprio de cada arquivo de teste de integração (spec 000, T005; plano §7).
// Copiado do banco-modelo (já com extensões e, a partir da T007, as migrations) em menos de um
// segundo; cada arquivo pode usar transações de verdade sem atrapalhar os outros.
//
// Uso:
//   let banco: BancoDoArquivo;
//   beforeAll(async () => { banco = await criarBancoDoArquivo(); });
//   afterAll(() => banco.apagar());
import { randomBytes } from "node:crypto";
import pg from "pg";
import { inject } from "vitest";
import { BANCO_MODELO } from "./constantes.js";

export interface BancoDoArquivo {
  nome: string;
  /** URL de conexão (postgresql://…) para o pg ou o Prisma. */
  url: string;
  /** Apaga o banco, derrubando as conexões que tiverem ficado abertas. */
  apagar(): Promise<void>;
}

function urlDoBanco(banco: string): string {
  const { host, porta, usuario, senha } = inject("postgresDeTeste");
  return `postgresql://${encodeURIComponent(usuario)}:${encodeURIComponent(senha)}@${host}:${String(porta)}/${banco}`;
}

async function comoAdministrador(sql: string): Promise<void> {
  const cliente = new pg.Client({ connectionString: urlDoBanco("postgres") });
  await cliente.connect();
  try {
    await cliente.query(sql);
  } finally {
    await cliente.end();
  }
}

export async function criarBancoDoArquivo(): Promise<BancoDoArquivo> {
  // Nome gerado aqui, só com letras e números: pode entrar no SQL sem risco.
  const nome = `t_${randomBytes(6).toString("hex")}`;
  await comoAdministrador(`CREATE DATABASE ${nome} TEMPLATE ${BANCO_MODELO}`);
  return {
    nome,
    url: urlDoBanco(nome),
    apagar: () => comoAdministrador(`DROP DATABASE IF EXISTS ${nome} WITH (FORCE)`),
  };
}

/** Tenta se conectar ao banco-modelo (que deve recusar). Só para o teste do próprio apoio. */
export async function conectarNoModelo(): Promise<void> {
  const cliente = new pg.Client({ connectionString: urlDoBanco(BANCO_MODELO) });
  await cliente.connect();
  await cliente.end();
}
