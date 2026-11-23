-- Roda uma vez, quando o volume do banco local é criado (docker-entrypoint-initdb.d).
-- pg_stat_statements guarda o tempo de cada consulta para a medição de performance
-- (plano §4 e §7). Fica fora das migrations e num schema próprio ("medicao"): é ferramenta
-- de medição, não parte da API, e assim um reset das migrations do Prisma não a apaga nem
-- a mistura com as tabelas da aplicação. O medidor (T027) confere se ela existe antes de medir.
-- As extensões da API (unaccent, pg_trgm) vêm pelas migrations do Prisma (T012).
CREATE SCHEMA IF NOT EXISTS medicao;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA medicao;
