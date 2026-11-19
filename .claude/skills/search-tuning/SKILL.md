---
name: search-tuning
description: Como medir e ajustar a busca do catálogo (api/): seed de 10 mil, EXPLAIN (ANALYZE, BUFFERS), trigram × tsvector, f_unaccent IMMUTABLE, limites de similaridade e testes de relevância com casos reais (código com hífen, nome sem acento, veículo). Use ao criar ou mudar a busca pública, seus índices ou a ordem de relevância.
---

# Ajuste da busca

## Regras da especificação (seção "Telas públicas do catálogo")

1. Procura em: código, código original, similares, nome, aplicação, aplicação por veículo e categoria.
2. Ignora acentos, maiúsculas, espaços, pontos e hífens em códigos ("hfcm-2313" acha "HFCM 2313").
3. **Todas as palavras precisam aparecer (E)**, em qualquer campo.
4. Ordem: **código exato → original/similar exato → começo do nome → resto**. O uso de `similarity()` está em aberto: veja `docs/decisoes-em-aberto.md`, D9.
5. Mínimo de 2 caracteres; 24 resultados por vez.

## Estrutura de dados (seção 7.2 do prompt)

- `codigo_normalizado` (minúsculo, sem espaço, ponto, hífen e barra) e a tabela `produto_codigo` (`produto_id`, `tipo`, `valor_normalizado`) com índice **B-tree** para a busca exata de original e similares.
- `busca_texto` = `f_unaccent(lower(...))` de nome, aplicação, categoria e veículos, com índice **GIN `gin_trgm_ops`**.
- `f_unaccent` é um wrapper `IMMUTABLE` (a função `unaccent` é só `STABLE` e não entra em índice):

  ```sql
  CREATE FUNCTION f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
  ```

- Avalie também um `tsvector` em português (com `unaccent`) e índice GIN para palavras completas. **Escolha pelo `EXPLAIN`, não por preferência, e documente.**

## Como medir

1. `npm run seed:perf -w api` (10 mil produtos, 30 categorias e aplicações por veículo, todos fictícios).
2. Para cada consulta crítica (busca com uma palavra, com várias, por código com hífen, por veículo; contagens dos filtros; detalhe):

   ```sql
   EXPLAIN (ANALYZE, BUFFERS) <consulta com os parâmetros reais>;
   ```

   - rode duas vezes e use a segunda (cache quente), anotando também a primeira;
   - **sem *Seq Scan* em tabela grande** nas rotas quentes;
   - salve em `docs/perf/<consulta>.txt` com a data.
3. Carga: autocannon ou k6 com **20 conexões simultâneas**. Metas: **busca p95 < 300 ms**, **detalhe p95 < 100 ms**. Resultado em `docs/perf/`.
4. Ajustes possíveis:
   - `pg_trgm.similarity_threshold` / `word_similarity_threshold`;
   - índice parcial `WHERE visivel`;
   - `statement_timeout`;
   - relevância numa **única query parametrizada (CTE)**.

## Testes de relevância (com casos reais de autopeças, dados fictícios)

- "hfcm-2313", "HFCM 2313" e "hfcm2313" acham o mesmo produto, primeiro na lista.
- "cilindro freio" (sem acento) acha "Cilindro mestre de freio".
- Código interno exato vem antes de original/similar exato, que vem antes do começo do nome.
- "volvo fh" acha pela aplicação por veículo.
- Peça oculta (`visivel = false`) nunca aparece.
- Palavra que não está em nenhum campo exclui o produto (regra do E).
