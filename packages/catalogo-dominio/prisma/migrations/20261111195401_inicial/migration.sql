-- Extensões ("trusted": o dono do banco pode criá-las) e busca em português sem acento.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TEXT SEARCH CONFIGURATION portuguese_unaccent (COPY = portuguese);
ALTER TEXT SEARCH CONFIGURATION portuguese_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;

-- CreateEnum
CREATE TYPE "SituacaoProduto" AS ENUM ('RASCUNHO', 'PUBLICADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "OrigemProduto" AS ENUM ('PDF', 'CADASTRO');

-- CreateEnum
CREATE TYPE "TipoMarca" AS ENUM ('FABRICANTE', 'MONTADORA', 'IMPLEMENTO');

-- CreateEnum
CREATE TYPE "PapelMarca" AS ENUM ('FABRICANTE', 'LOGO', 'MONTADORA');

-- CreateEnum
CREATE TYPE "TipoReferencia" AS ENUM ('ORIGINAL', 'SIMILAR', 'EQUIVALENTE', 'FABRICANTE');

-- CreateEnum
CREATE TYPE "TipoSlug" AS ENUM ('PRODUTO', 'CATEGORIA', 'GRUPO');

-- CreateEnum
CREATE TYPE "SituacaoOrcamento" AS ENUM ('RASCUNHO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "Permissao" AS ENUM ('ver_produtos', 'editar_produtos', 'publicar', 'ver_codigo_interno', 'ver_imposto', 'ver_localizacao', 'editar_localizacao', 'categorias', 'marcas', 'consulta_rapida', 'orcamentos', 'orcamentos_de_todos', 'historico', 'usuarios_perfis');

-- CreateTable
CREATE TABLE "Grupo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT NOT NULL DEFAULT '',
    "seoTitulo" TEXT,
    "seoDescricao" TEXT,
    "indexavel" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "grupoId" INTEGER,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT NOT NULL DEFAULT '',
    "modeloEspecificacoes" TEXT NOT NULL DEFAULT '',
    "seoTitulo" TEXT,
    "seoDescricao" TEXT,
    "indexavel" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL,
    "chaveImportacao" TEXT,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeCatalogo" TEXT NOT NULL DEFAULT '',
    "aplicacao" TEXT NOT NULL DEFAULT '',
    "especificacoes" TEXT NOT NULL DEFAULT '',
    "observacoes" TEXT NOT NULL DEFAULT '',
    "embalagem" TEXT,
    "situacao" "SituacaoProduto" NOT NULL DEFAULT 'RASCUNHO',
    "origem" "OrigemProduto" NOT NULL DEFAULT 'CADASTRO',
    "novo" BOOLEAN NOT NULL DEFAULT false,
    "indexavel" BOOLEAN NOT NULL DEFAULT false,
    "revisarNome" BOOLEAN NOT NULL DEFAULT false,
    "seoTitulo" TEXT,
    "seoDescricao" TEXT,
    "hashPublico" TEXT,
    "buscaTexto" tsvector,
    "buscaCodigos" TEXT NOT NULL DEFAULT '',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "editadoManualmente" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoCategoria" (
    "produtoId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProdutoCategoria_pkey" PRIMARY KEY ("produtoId","categoriaId")
);

-- CreateTable
CREATE TABLE "Variacao" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "nomeCatalogo" TEXT NOT NULL DEFAULT '',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "excluidaEm" TIMESTAMP(3),

    CONSTRAINT "Variacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marca" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tipo" "TipoMarca" NOT NULL DEFAULT 'FABRICANTE',
    "logo" TEXT,

    CONSTRAINT "Marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoMarca" (
    "produtoId" INTEGER NOT NULL,
    "marcaId" INTEGER NOT NULL,
    "papel" "PapelMarca" NOT NULL,

    CONSTRAINT "ProdutoMarca_pkey" PRIMARY KEY ("produtoId","marcaId","papel")
);

-- CreateTable
CREATE TABLE "Referencia" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "variacaoId" INTEGER,
    "marcaId" INTEGER,
    "tipo" "TipoReferencia" NOT NULL DEFAULT 'EQUIVALENTE',
    "codigo" TEXT NOT NULL,
    "codigoNormalizado" TEXT NOT NULL,
    "publicada" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Referencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Imagem" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "arquivo" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "largura" INTEGER NOT NULL,
    "altura" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Imagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlugAntigo" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "tipo" "TipoSlug" NOT NULL,
    "entidadeId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlugAntigo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariacaoInterna" (
    "variacaoId" INTEGER NOT NULL,
    "codigoInterno" TEXT NOT NULL,
    "codigoNormalizado" TEXT NOT NULL DEFAULT '',
    "imposto" DECIMAL(5,2),

    CONSTRAINT "VariacaoInterna_pkey" PRIMARY KEY ("variacaoId")
);

-- CreateTable
CREATE TABLE "ProdutoInterno" (
    "produtoId" INTEGER NOT NULL,
    "localizacao" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ProdutoInterno_pkey" PRIMARY KEY ("produtoId")
);

-- CreateTable
CREATE TABLE "CardOrigem" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "pagina" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "categoriaId" INTEGER,
    "textoOriginal" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CardOrigem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pendencia" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "trecho" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'desconhecido',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pendencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaveApi" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadaPorId" INTEGER,
    "expiraEm" TIMESTAMP(3),
    "revogadaEm" TIMESTAMP(3),
    "ultimoUso" TIMESTAMP(3),

    CONSTRAINT "ChaveApi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroConsulta" (
    "id" SERIAL NOT NULL,
    "chaveApiId" INTEGER NOT NULL,
    "produtosRetornados" INTEGER[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroConsulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perfil" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "administrador" BOOLEAN NOT NULL DEFAULT false,
    "permissoes" "Permissao"[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfilId" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "trocarSenha" BOOLEAN NOT NULL DEFAULT false,
    "senhaTemporariaExpiraEm" TIMESTAMP(3),
    "ultimoAcesso" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessao" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TentativaLogin" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAcesso" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "evento" TEXT NOT NULL,
    "detalhe" TEXT NOT NULL DEFAULT '',
    "ip" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alteracao" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "entidade" TEXT NOT NULL,
    "entidadeId" INTEGER NOT NULL,
    "versao" INTEGER,
    "acao" TEXT NOT NULL,
    "campos" JSONB NOT NULL DEFAULT '{}',
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alteracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "numero" SERIAL NOT NULL,
    "identificacao" TEXT NOT NULL DEFAULT '',
    "situacao" "SituacaoOrcamento" NOT NULL DEFAULT 'RASCUNHO',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoPorId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("numero")
);

-- CreateTable
CREATE TABLE "OrcamentoItem" (
    "id" SERIAL NOT NULL,
    "orcamentoNumero" INTEGER NOT NULL,
    "variacaoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "valorUnitario" DECIMAL(12,2),
    "observacao" TEXT NOT NULL DEFAULT '',
    "ordem" INTEGER NOT NULL,
    "nomeNoMomento" TEXT NOT NULL,
    "variacaoNoMomento" TEXT NOT NULL DEFAULT '',
    "referenciaNoMomento" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "OrcamentoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_slug_key" ON "Grupo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_slug_key" ON "Categoria"("slug");

-- CreateIndex
CREATE INDEX "Categoria_grupoId_ordem_idx" ON "Categoria"("grupoId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_chaveImportacao_key" ON "Produto"("chaveImportacao");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_slug_key" ON "Produto"("slug");

-- CreateIndex
CREATE INDEX "Produto_situacao_indexavel_idx" ON "Produto"("situacao", "indexavel");

-- CreateIndex
CREATE INDEX "Produto_buscaTexto_idx" ON "Produto" USING GIN ("buscaTexto");

-- CreateIndex
CREATE INDEX "Produto_buscaCodigos_idx" ON "Produto" USING GIN ("buscaCodigos" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "ProdutoCategoria_categoriaId_ordem_idx" ON "ProdutoCategoria"("categoriaId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoCategoria_uma_principal" ON "ProdutoCategoria"("produtoId") WHERE ("principal" = true);

-- CreateIndex
CREATE INDEX "Variacao_produtoId_ordem_idx" ON "Variacao"("produtoId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "Marca_nome_key" ON "Marca"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Marca_slug_key" ON "Marca"("slug");

-- CreateIndex
CREATE INDEX "ProdutoMarca_marcaId_papel_idx" ON "ProdutoMarca"("marcaId", "papel");

-- CreateIndex
CREATE INDEX "Referencia_codigoNormalizado_idx" ON "Referencia"("codigoNormalizado");

-- CreateIndex
CREATE INDEX "Referencia_produtoId_idx" ON "Referencia"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "Imagem_arquivo_key" ON "Imagem"("arquivo");

-- CreateIndex
CREATE INDEX "Imagem_produtoId_ordem_idx" ON "Imagem"("produtoId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "SlugAntigo_slug_tipo_key" ON "SlugAntigo"("slug", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "VariacaoInterna_codigoInterno_key" ON "VariacaoInterna"("codigoInterno");

-- CreateIndex
CREATE INDEX "VariacaoInterna_codigoNormalizado_idx" ON "VariacaoInterna" USING GIN ("codigoNormalizado" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "ProdutoInterno_localizacao_idx" ON "ProdutoInterno" USING GIN ("localizacao" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "CardOrigem_produtoId_idx" ON "CardOrigem"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "CardOrigem_pagina_ordem_key" ON "CardOrigem"("pagina", "ordem");

-- CreateIndex
CREATE INDEX "Pendencia_produtoId_idx" ON "Pendencia"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaveApi_hashSha256_key" ON "ChaveApi"("hashSha256");

-- CreateIndex
CREATE INDEX "RegistroConsulta_criadoEm_idx" ON "RegistroConsulta"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Perfil_nome_key" ON "Perfil"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sessao_tokenHash_key" ON "Sessao"("tokenHash");

-- CreateIndex
CREATE INDEX "Sessao_usuarioId_idx" ON "Sessao"("usuarioId");

-- CreateIndex
CREATE INDEX "Sessao_expiraEm_idx" ON "Sessao"("expiraEm");

-- CreateIndex
CREATE INDEX "TentativaLogin_email_ip_criadaEm_idx" ON "TentativaLogin"("email", "ip", "criadaEm");

-- CreateIndex
CREATE INDEX "TentativaLogin_criadaEm_idx" ON "TentativaLogin"("criadaEm");

-- CreateIndex
CREATE INDEX "RegistroAcesso_criadoEm_idx" ON "RegistroAcesso"("criadoEm" DESC);

-- CreateIndex
CREATE INDEX "Alteracao_entidade_entidadeId_criadaEm_idx" ON "Alteracao"("entidade", "entidadeId", "criadaEm" DESC);

-- CreateIndex
CREATE INDEX "Alteracao_criadaEm_idx" ON "Alteracao"("criadaEm" DESC);

-- CreateIndex
CREATE INDEX "Orcamento_criadoPorId_situacao_criadoEm_idx" ON "Orcamento"("criadoPorId", "situacao", "criadoEm");

-- CreateIndex
CREATE INDEX "Orcamento_criadoEm_idx" ON "Orcamento"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "OrcamentoItem_orcamentoNumero_variacaoId_key" ON "OrcamentoItem"("orcamentoNumero", "variacaoId");

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoCategoria" ADD CONSTRAINT "ProdutoCategoria_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoCategoria" ADD CONSTRAINT "ProdutoCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variacao" ADD CONSTRAINT "Variacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoMarca" ADD CONSTRAINT "ProdutoMarca_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoMarca" ADD CONSTRAINT "ProdutoMarca_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "Marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referencia" ADD CONSTRAINT "Referencia_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referencia" ADD CONSTRAINT "Referencia_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "Variacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referencia" ADD CONSTRAINT "Referencia_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "Marca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Imagem" ADD CONSTRAINT "Imagem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariacaoInterna" ADD CONSTRAINT "VariacaoInterna_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "Variacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoInterno" ADD CONSTRAINT "ProdutoInterno_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardOrigem" ADD CONSTRAINT "CardOrigem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardOrigem" ADD CONSTRAINT "CardOrigem_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendencia" ADD CONSTRAINT "Pendencia_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaveApi" ADD CONSTRAINT "ChaveApi_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroConsulta" ADD CONSTRAINT "RegistroConsulta_chaveApiId_fkey" FOREIGN KEY ("chaveApiId") REFERENCES "ChaveApi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAcesso" ADD CONSTRAINT "RegistroAcesso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alteracao" ADD CONSTRAINT "Alteracao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoItem" ADD CONSTRAINT "OrcamentoItem_orcamentoNumero_fkey" FOREIGN KEY ("orcamentoNumero") REFERENCES "Orcamento"("numero") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoItem" ADD CONSTRAINT "OrcamentoItem_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "Variacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─── Regras que o Prisma não modela ─────────────────────────────────────────
ALTER TABLE "OrcamentoItem" ADD CONSTRAINT "OrcamentoItem_quantidade_minima" CHECK ("quantidade" >= 1);

-- ─── Permissões por papel (plano 003, §3) ───────────────────────────────────
-- Schema: só os papéis do catálogo o usam (repetido aqui para valer também após um reset).
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO catalogo_painel, catalogo_publico;

-- Painel: lê e grava tudo o que existe hoje e o que for criado depois.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO catalogo_painel;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catalogo_painel;
ALTER DEFAULT PRIVILEGES FOR ROLE catalogo_migracoes IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO catalogo_painel;
ALTER DEFAULT PRIVILEGES FOR ROLE catalogo_migracoes IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO catalogo_painel;

-- Público: só leitura, só nas tabelas públicas, uma por uma.
-- Tabela nova NÃO fica visível ao público por padrão: precisa de GRANT explícito numa migração.
GRANT SELECT ON "Grupo", "Categoria", "Produto", "ProdutoCategoria", "Variacao",
  "Marca", "ProdutoMarca", "Referencia", "Imagem", "SlugAntigo" TO catalogo_publico;
