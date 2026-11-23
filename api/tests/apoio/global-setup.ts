// Prepara o PostgreSQL dos testes de integração (spec 000, T005; plano §7). Roda uma vez por
// execução do projeto "integracao":
// 1) sobe um container com a MESMA imagem, initdb e configurações do api/docker-compose.yml
//    (lidos do próprio arquivo), mais fsync e afins desligados: este banco nunca mede performance;
// 2) aplica as migrations no banco-modelo (prisma migrate deploy, o mesmo comando da produção);
// 3) fecha o modelo para conexões: uma conexão esquecida faria todo CREATE DATABASE falhar.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import type { TestProject } from "vitest/node";
import { BANCO_MODELO } from "./constantes.js";
import { lerPostgresDoCompose } from "./postgres-do-compose.js";

let container: StartedPostgreSqlContainer | undefined;

export async function setup(projeto: TestProject): Promise<void> {
  const compose = readFileSync(new URL("../../docker-compose.yml", import.meta.url), "utf8");
  const { imagem, argumentosDoInitdb, configuracoes } = lerPostgresDoCompose(compose);
  const usuario = "teste";
  const senha = randomBytes(18).toString("hex");

  container = await new PostgreSqlContainer(imagem)
    .withDatabase(BANCO_MODELO)
    .withUsername(usuario)
    .withPassword(senha)
    .withEnvironment({ POSTGRES_INITDB_ARGS: argumentosDoInitdb })
    .withCommand([
      "postgres",
      ...configuracoes.flatMap((configuracao) => ["-c", configuracao]),
      // Só nos testes: sem garantia de gravação em disco, a suíte fica bem mais rápida.
      ...["-c", "fsync=off", "-c", "synchronous_commit=off", "-c", "full_page_writes=off"],
    ])
    .start();

  const conexao = { host: container.getHost(), port: container.getPort(), user: usuario, password: senha };

  // Migrations no banco-modelo, pelo CLI do Prisma (o mesmo comando da produção).
  const pastaDaApi = fileURLToPath(new URL("../../", import.meta.url));
  const cliDoPrisma = createRequire(import.meta.url).resolve("prisma/build/index.js");
  const urlDoModelo = `postgresql://${usuario}:${senha}@${conexao.host}:${String(conexao.port)}/${BANCO_MODELO}`;
  execFileSync(process.execPath, [cliDoPrisma, "migrate", "deploy"], {
    cwd: pastaDaApi,
    env: { ...process.env, DATABASE_URL: urlDoModelo },
    stdio: "pipe",
  });

  const admin = new pg.Client({ ...conexao, database: "postgres" });
  await admin.connect();
  try {
    await admin.query(`ALTER DATABASE ${BANCO_MODELO} WITH IS_TEMPLATE true ALLOW_CONNECTIONS false`);
    await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1", [BANCO_MODELO]);
  } finally {
    await admin.end();
  }

  projeto.provide("postgresDeTeste", { host: conexao.host, porta: conexao.port, usuario, senha });
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
