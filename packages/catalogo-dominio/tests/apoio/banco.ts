// Clientes do banco de testes, um por papel, e limpeza entre testes.
import pg from "pg";
import { criarCliente, type ClienteBanco } from "../../src/banco";
import { urlsDeTeste } from "./urls";

const urls = urlsDeTeste();

/** Cliente com o papel do painel (lê e grava), como a aplicação usa. */
export function clientePainel(): ClienteBanco {
  return criarCliente(urls.painel);
}

/** Conexão crua com o papel público, para testar o que ele consegue ler. */
export async function conexaoPublica(): Promise<pg.Client> {
  const cliente = new pg.Client({ connectionString: urls.publico });
  await cliente.connect();
  return cliente;
}

/** Conexão crua com o papel dono, para limpar e inspecionar o banco. */
export async function conexaoDona(): Promise<pg.Client> {
  const cliente = new pg.Client({ connectionString: urls.migracoes });
  await cliente.connect();
  return cliente;
}

/** Esvazia todas as tabelas (menos o controle de migrações) e reinicia as sequências. */
export async function limparBanco(): Promise<void> {
  const dono = await conexaoDona();
  try {
    const { rows } = await dono.query<{ nome: string }>(
      `SELECT format('%I', tablename) AS nome FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    );
    if (rows.length) {
      await dono.query(`TRUNCATE ${rows.map((r) => r.nome).join(", ")} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await dono.end();
  }
}
