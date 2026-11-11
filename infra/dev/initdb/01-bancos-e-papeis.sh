#!/bin/sh
# Roda uma única vez, quando o volume do banco é criado.
# Cria os bancos e os três papéis do plano 003 (§3):
#   catalogo_migracoes: dono das tabelas, só roda migrações;
#   catalogo_painel:    lê e grava (painel);
#   catalogo_publico:   só lê as tabelas públicas (API do site).
# Extensões (unaccent e pg_trgm são "trusted") e permissões de tabela ficam nas
# migrações (packages/catalogo-dominio/prisma/migrations), rodadas pelo papel dono.
set -e
psql -v ON_ERROR_STOP=1 --username postgres <<SQL
CREATE ROLE catalogo_migracoes LOGIN PASSWORD '${SENHA_MIGRACOES}';
CREATE ROLE catalogo_painel    LOGIN PASSWORD '${SENHA_PAINEL}';
CREATE ROLE catalogo_publico   LOGIN PASSWORD '${SENHA_PUBLICO}';
CREATE DATABASE falcao_dev   OWNER catalogo_migracoes;
CREATE DATABASE falcao_teste OWNER catalogo_migracoes;
-- Banco-sombra: usado só pelo prisma migrate dev para conferir as migrações.
CREATE DATABASE falcao_sombra OWNER catalogo_migracoes;
SQL
for banco in falcao_dev falcao_teste falcao_sombra; do
psql -v ON_ERROR_STOP=1 --username postgres --dbname "$banco" <<SQL
-- Ninguém além dos papéis do catálogo usa o schema public.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO catalogo_migracoes;
GRANT USAGE ON SCHEMA public TO catalogo_painel, catalogo_publico;
REVOKE ALL ON DATABASE $banco FROM PUBLIC;
GRANT CONNECT ON DATABASE $banco TO catalogo_painel, catalogo_publico;
SQL
done
