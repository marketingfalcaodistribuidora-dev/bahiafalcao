// Constantes do apoio de testes, num arquivo leve: os testes as importam sem carregar o
// Testcontainers (que só roda no global-setup).

/** Banco já migrado de onde cada arquivo de teste copia o seu (CREATE DATABASE … TEMPLATE). */
export const BANCO_MODELO = "falcao_modelo";

/** Como os testes chegam ao PostgreSQL do Testcontainers (preenchido pelo global-setup). */
export interface PostgresDeTeste {
  host: string;
  porta: number;
  usuario: string;
  senha: string;
}

declare module "vitest" {
  export interface ProvidedContext {
    postgresDeTeste: PostgresDeTeste;
  }
}
