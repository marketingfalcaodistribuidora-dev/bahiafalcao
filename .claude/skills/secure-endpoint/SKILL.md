---
name: secure-endpoint
description: Checklist obrigatório para toda rota nova ou alterada da API do catálogo (api/). Use ao planejar, implementar ou revisar qualquer rota Fastify (pública ou da administração).
argument-hint: "<MÉTODO /api/rota>"
---

# Rota segura

Siga cada item. O que não se aplica, justifique no `plan.md`.

## Contrato

- [ ] Schema Zod de **entrada** com `.strict()` para body, query, params e os headers relevantes. Campos extras são recusados (contra *mass assignment*).
- [ ] Limites em todo texto (`max`), array (`max`) e número (`min`/`max`); paginação com teto (24 no público, 25 na administração).
- [ ] Schema Zod de **saída** só com os campos permitidos. Nunca `senha_hash`, token, hash nem campo interno.
- [ ] `bodyLimit` próprio da rota.
- [ ] A rota aparece no OpenAPI (`/docs`) e o teste de contrato confere a resposta real.

## Acesso

- [ ] Papel exigido declarado na rota (`config.papel`: `publico`, `logado`, `editor` ou `admin`) e aplicado pelo hook de autorização. **Nunca** uma checagem avulsa dentro do handler.
- [ ] Entrada na **matriz de autorização** (anônimo, editor, administrador, desativado, sessão expirada → status esperado).
- [ ] **IDOR:** o recurso pedido pertence a quem pede, ou o papel permite; teste trocando o id.
- [ ] Proteções da especificação: último administrador ativo, ninguém age sobre si mesmo.

## Escrita (POST, PUT, PATCH, DELETE)

- [ ] **CSRF:** token conferido nas rotas da administração e `Origin`/`Referer` contra a lista permitida.
- [ ] Registro em `atividade` (quem, quando, o quê, IP), quando a especificação manda.
- [ ] Concorrência: `atualizado_em` conferido; conflito responde **409** com quem alterou.
- [ ] Transação onde a operação precisa ser atômica.

## Abuso

- [ ] **Rate limit** por IP **e** por identificador quando houver (e-mail, usuário).
- [ ] Mensagens que não revelam se um e-mail existe (anti-enumeração), com o tempo de resposta igualado.
- [ ] `statement_timeout` nas consultas públicas.

## Erros e logs

- [ ] Erros no formato único `{ erro, mensagem, campos }`. Erros do Prisma viram erros de domínio. Nada de stack trace nem SQL.
- [ ] Logs com `requestId` e `redact` de senha, token, cookie e `authorization`. Eventos de segurança no log de segurança.

## Testes mínimos

- [ ] Caminho feliz, validação e cada papel.
- [ ] *Mass assignment* (campo extra → 400).
- [ ] IDOR (id de outro recurso → 403 ou 404, conforme a spec).
- [ ] Texto com `<script>` volta intacto como texto, nunca transformado em HTML.
