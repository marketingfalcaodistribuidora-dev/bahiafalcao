-- Extensões e f_unaccent (spec 000, T007; plano §4; skill prisma-migration).
--
-- Por quê:
-- - unaccent: a busca (Fase 4) ignora acentos. Ela é só STABLE e não entra em índice; por isso o
--   wrapper f_unaccent, IMMUTABLE, como manda a documentação do PostgreSQL.
-- - Tudo qualificado com public.: no PostgreSQL 17, CREATE INDEX, REINDEX, VACUUM e ANALYZE rodam
--   com search_path restrito, e uma chamada sem schema quebraria o índice.
-- - Sem SET search_path na função: com ele, cada chamada pagaria a troca de configuração.
-- - pg_trgm: índice GIN para a busca parcial (Fase 4).
--
-- Rollback (o Prisma não gera "down"):
--   DROP FUNCTION public.f_unaccent(text); DROP EXTENSION pg_trgm; DROP EXTENSION unaccent;
-- Produção: CREATE EXTENSION exige o dono do banco (ou superusuário) na VPS (Fase 7).

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE FUNCTION public.f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
