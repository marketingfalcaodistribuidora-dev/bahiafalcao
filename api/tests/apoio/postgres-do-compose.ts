// Lê do api/docker-compose.yml a configuração do PostgreSQL (spec 000, T005), para o banco dos
// testes ser igual ao local: mesma imagem (digest), mesmo initdb (locale) e mesmas configurações
// (fuso, jit...). Um leitor simples, sem dependência de YAML: o formato do compose é nosso.

export interface PostgresDoCompose {
  /** Imagem com tag e digest, ex.: postgres:17.11-alpine@sha256:… */
  imagem: string;
  /** Valor de POSTGRES_INITDB_ARGS. */
  argumentosDoInitdb: string;
  /** Configurações passadas com "-c" no command, na ordem (ex.: "timezone=UTC"). */
  configuracoes: string[];
}

export function lerPostgresDoCompose(compose: string): PostgresDoCompose {
  // Só o bloco do serviço postgres (até o próximo serviço, mailpit).
  const inicio = compose.indexOf("  postgres:");
  const fim = compose.indexOf("\n  mailpit:", inicio);
  if (inicio === -1 || fim === -1) throw new Error("docker-compose.yml: serviço postgres não encontrado.");
  const bloco = compose.slice(inicio, fim);

  const imagem = /^\s*image:\s*(\S+)\s*$/m.exec(bloco)?.[1];
  if (!imagem || !/@sha256:[0-9a-f]{64}$/.test(imagem)) {
    throw new Error("docker-compose.yml: a imagem do postgres precisa estar fixada por digest.");
  }

  const argumentosDoInitdb = /^\s*POSTGRES_INITDB_ARGS:\s*"([^"]+)"\s*$/m.exec(bloco)?.[1];
  if (!argumentosDoInitdb) throw new Error("docker-compose.yml: POSTGRES_INITDB_ARGS não encontrado.");

  const configuracoes = [...bloco.matchAll(/^\s*- -c\s*\n\s*- (\S+)\s*$/gm)].map((m) => m[1] ?? "");
  return { imagem, argumentosDoInitdb, configuracoes };
}
