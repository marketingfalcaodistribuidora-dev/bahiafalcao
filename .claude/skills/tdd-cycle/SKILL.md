---
name: tdd-cycle
description: Ciclo Red → Green → Refactor passo a passo, com teste de integração usando Testcontainers + app.inject, factories, relógio controlado e matriz de autorização. Use SEMPRE que for escrever ou mudar lógica (API do catálogo em api/ ou lógica do site em frontend/), corrigir bug ou refatorar. Mostre a falha antes de implementar.
argument-hint: "<tarefa T0NN ou descrição do comportamento>"
---

# TDD: teste falhando antes do código

**Proibido escrever código de produção sem um teste que falhou antes.** Exceções: configuração, migrations e tipos, que ficam cobertos pelos testes de integração.

## O ciclo

1. **Red:**
   - escreva o teste que falha, ligado a um critério de aceite (`CAx.y` no nome ou num comentário);
   - rode e **mostre a falha**, que precisa ser pelo motivo certo (o comportamento ainda não existe, não um erro de importação).
2. **Green:** implemente o **mínimo** para passar e rode de novo.
3. **Refactor:**
   - melhore nomes e estrutura com tudo verde;
   - rode a suíte do módulo;
   - registre a tarefa como feita no `tasks.md`.

## Como escrever cada tipo de teste (API)

### Unitário (regra de domínio, normalização, validação)

```ts
// api/tests/unit/produtos/normalizar-codigo.test.ts
it("ignora espaço, ponto, hífen e barra (CA2.3)", () => {
  expect(normalizarCodigo(" HFCM-23.13/ ")).toBe("hfcm2313");
});
```

O service recebe as dependências por parâmetro (`Clock`, repositórios, `EmailSender`). Nada de mock global.

### Integração (rota + PostgreSQL real)

- Um container PostgreSQL por execução (Testcontainers, `@testcontainers/postgresql`). As migrations rodam **uma vez**, num banco-modelo (`falcao_modelo`).
- **Banco isolado por arquivo de teste:** cada arquivo cria o seu com `CREATE DATABASE t_<id> TEMPLATE falcao_modelo` e o apaga no fim. Ele já vem com extensões, funções e tabelas, e aceita transações de verdade.
- Pool pequeno nos testes (2 a 3 conexões) e `maxWorkers` dentro do `max_connections`.
- Contar queries com o auxiliar `contarQueries` nos testes de N+1.
- HTTP só por `app.inject()`, nunca com `listen`. A exceção é a **medição de performance** (`npm run test:perf -w api`), que usa sockets reais pelo medidor, contra o banco do `docker-compose`.

```ts
it("Editor não acessa Usuários (CA3.4)", async () => {
  const app = await montarApp({ clock: relogioFixo("2026-11-19T10:00:00Z") });
  const cookie = await entrarComo(app, await fabricas.usuario({ papel: "editor" }));

  const resposta = await app.inject({ method: "GET", url: "/api/admin/usuarios", cookies: cookie });

  expect(resposta.statusCode).toBe(403);
  expect(resposta.json()).toMatchObject({ erro: "sem_permissao" });
});
```

### Factories

Em `api/tests/factories/`, com dados fictícios (nunca dados reais do catálogo: o repositório é público). Cada factory recebe só o que o teste precisa sobrescrever.

### Relógio controlado

`Clock` injetado (preferível) ou `vi.useFakeTimers()`. **Nunca `sleep`.** Expiração de sessão, bloqueio por 15 min e validade de link se testam avançando o relógio.

### Matriz de autorização

Um teste parametrizado percorre **todas as rotas registradas no app × todos os papéis** (anônimo, editor, administrador, usuário desativado, sessão expirada) e confere o status esperado (200/401/403). A lista de rotas vem do próprio Fastify (`app.printRoutes` ou o hook `onRoute`): **rota nova sem entrada na matriz faz o teste falhar.**

### Segurança e contrato

- **Segurança:** injeção, `<script>` volta intacto (nunca transformado em HTML), IDOR, enumeração de e-mail, reuso de token, campos extras recusados, upload malicioso.
- **Contrato:** a resposta real valida contra o OpenAPI gerado.

## Comandos

- `npm test -w api`: todos os testes.
- `npm run test:integration -w api`: só integração.
- `npm run test:coverage -w api`: cobertura (≥ 90% em `src/modules/**`).
