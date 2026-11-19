---
name: prisma-migration
description: Migrations seguras do Prisma na API do catálogo (api/prisma): revisar o SQL gerado, índices com justificativa, CREATE INDEX CONCURRENTLY quando a tabela já tem dados, nunca editar migration aplicada, plano de rollback e teste em banco limpo e com dados. Use em toda mudança de schema.prisma ou de SQL de migration.
argument-hint: "<nome-da-migration>"
---

# Migration segura

## Passos

1. **Planeje no `plan.md`:** o que muda, por quê, o índice e a consulta que ele atende, e o rollback.
2. **Gere sem aplicar:** `npm run db:migrate -w api -- --create-only --name <nome>`.
3. **Leia o SQL gerado inteiro** (`api/prisma/migrations/<data>_<nome>/migration.sql`):
   - nada de `DROP` ou mudança de tipo com perda de dado sem um passo de cópia;
   - `NOT NULL` em tabela com dados só com `DEFAULT` ou preenchimento antes;
   - nome de índice e de restrição legível.
4. **Índices:**
   - cada um com a consulta que o usa e o `EXPLAIN` esperado (skill `search-tuning` para busca);
   - **tabela que já tem dados em produção:** `CREATE INDEX CONCURRENTLY` numa migration só com essa instrução (ela não pode rodar dentro de transação);
   - índices de expressão com `unaccent` usam o wrapper `f_unaccent`, `IMMUTABLE`.
5. **Extensões:** `unaccent` e `pg_trgm` com `CREATE EXTENSION IF NOT EXISTS` na primeira migration.
6. **Nunca edite uma migration já aplicada** em qualquer ambiente compartilhado. Corrija com uma migration nova.
7. **Rollback:** escreva no `plan.md` o SQL que desfaz a mudança. O Prisma não gera migrations "down".
8. **Teste:**
   - em **banco limpo** (o Testcontainers aplica todas as migrations do zero em cada execução);
   - **com dados:** rode o `seed:perf` (10 mil produtos) e aplique a migration por cima;
   - drift: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` precisa sair vazio.
9. **Produção:** só `prisma migrate deploy`, com backup feito antes.
