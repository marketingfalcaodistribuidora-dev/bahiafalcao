// O banco dos testes usa a MESMA imagem, os mesmos parâmetros do initdb e o mesmo fuso do banco
// local (spec 000, T005). Para os dois não se separarem, o apoio de testes lê tudo direto do
// api/docker-compose.yml, que é a única fonte.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lerPostgresDoCompose } from "../../apoio/postgres-do-compose.js";

const compose = readFileSync(new URL("../../../docker-compose.yml", import.meta.url), "utf8");

describe("lerPostgresDoCompose", () => {
  it("lê a imagem do PostgreSQL com o digest", () => {
    expect(lerPostgresDoCompose(compose).imagem).toMatch(/^postgres:17\.\d+-alpine@sha256:[0-9a-f]{64}$/);
  });

  it("lê os parâmetros do initdb (locale fixo)", () => {
    expect(lerPostgresDoCompose(compose).argumentosDoInitdb).toBe(
      "--encoding=UTF8 --locale=C.UTF-8 --locale-provider=builtin --builtin-locale=C.UTF-8",
    );
  });

  it("lê as configurações do servidor passadas com -c, na ordem", () => {
    expect(lerPostgresDoCompose(compose).configuracoes).toContain("timezone=UTC");
    expect(lerPostgresDoCompose(compose).configuracoes).toContain("jit=off");
  });

  it("recusa um compose sem a imagem fixada por digest", () => {
    const semDigest = compose.replace(/@sha256:[0-9a-f]{64}/, "");

    expect(() => lerPostgresDoCompose(semDigest)).toThrow("digest");
  });
});
