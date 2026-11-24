# API do catálogo Falcão (`api/`)

Backend do catálogo online da Falcão Distribuidora: autopeças para linha pesada em Feira de Santana, BA.
- **Público, sem login:** busca de peças por código, código original, similares, nome e veículo, com filtros. O cliente monta uma lista e envia a cotação pelo WhatsApp. **O servidor não guarda cotações.**
- **Administração com login:**
  - produtos, categorias e importação de planilha;
  - usuários com papéis Administrador e Editor, por convite;
  - configurações e registro de atividades.

**Nesta etapa, só a API.** O front do catálogo vem depois, em `frontend/` (Next.js), e consome o contrato OpenAPI e os tipos de `contracts/`.

## Fontes da verdade

| Fonte | Uso |
|---|---|
| [`docs/especificacao.md`](../docs/especificacao.md) | Regras de negócio, modelo de dados, API, estados, permissões e critérios de aceite. **Fonte principal.** |
| [`PROMPT_BACKEND_FALCAO.md`](../PROMPT_BACKEND_FALCAO.md) | Stack, metodologia, segurança, performance e fases. |
| [`docs/decisoes-em-aberto.md`](../docs/decisoes-em-aberto.md) | O que não está definido. **Não invente regra de negócio:** registre ali e pergunte. |
| [`docs/dependencias.md`](../docs/dependencias.md) | Registro de cada dependência verificada. |

Se a especificação e o prompt divergirem, **pare e pergunte**.

## Regras inegociáveis

1. **SDD:**
   - nenhuma funcionalidade começa sem `specs/NNN-*/` (spec, plan e tasks), skill `/sdd-feature`, com a **aprovação do responsável**;
   - cada fase do prompt termina parando para aprovação.
2. **TDD:**
   - proibido código de produção sem um teste que falhou antes (skill `/tdd-cycle`). Mostre a falha;
   - exceções: configuração, migrations e tipos, cobertos por testes de integração.
3. **Testes:**
   - integração com **PostgreSQL real via Testcontainers** e `app.inject()`;
   - nunca SQLite nem mock de banco para testar query;
   - **matriz de autorização:** todas as rotas × anônimo, editor, administrador, desativado e sessão expirada;
   - testes de segurança e de performance (seed de 10 mil);
   - **cobertura ≥ 90%** de linhas e ramos em `src/modules/**`, `src/plugins/**` e `src/shared/**`;
   - testes determinísticos: `Clock` injetado, sem `sleep`, banco isolado por arquivo.
4. **Dependências:**
   - nenhum pacote sem o protocolo da skill `/dependency-check` e a linha em `docs/dependencias.md`;
   - versões **exatas** (sem `^` nem `~`);
   - nada com menos de 7 dias;
   - scripts de instalação só os liberados em `allowScripts`.
5. **Arquitetura em camadas por módulo:**
   - `routes` (HTTP e schemas) → `service` (regra de negócio, sem Fastify) → `repository` (Prisma e SQL, sem regra);
   - dependências injetadas: Clock, EmailSender, Storage e repositórios.
6. **Zod como fonte única:**
   - entrada `.strict()` com limites;
   - saída só com os campos permitidos;
   - OpenAPI 3.1 em `/docs` (protegido em produção);
   - tipos em `contracts/`.
7. **Erros** sempre como `{ "erro": "codigo_maquina", "mensagem": "texto para pessoas", "campos": { … } }`. Erros do Prisma viram erros de domínio. Nunca stack trace nem SQL.
8. **Segurança:** OWASP ASVS nível 2 (seção 7.1 do prompt). Toda rota nova passa pela skill `/secure-endpoint`.
9. **Performance:** busca p95 < 300 ms e detalhe p95 < 100 ms com 10 mil produtos e 20 requisições simultâneas, com o `EXPLAIN` salvo em `docs/perf/` (skill `/search-tuning`).
10. **Migrations** pela skill `/prisma-migration`. Nunca edite uma migration aplicada.
11. **Repositório público:** nenhum dado real do catálogo, segredo ou dado pessoal em código, teste, comentário ou documento. Segredos só em `api/.env` (fora do Git), validados por Zod no boot.

## Proibições

- Código de produção sem teste falhando antes.
- `any`, `@ts-ignore` sem justificativa escrita, `$queryRawUnsafe`/`$executeRawUnsafe`, `eval` e `new Function`.
- Instalar pacote sem o protocolo, ou com `^`/`~`.
- Guardar senha ou token em texto puro; logar dado sensível.
- Inventar regra de negócio fora da especificação.
- Commits gigantes ou que misturam assuntos.
- Desativar testes, regras de lint ou checagens de segurança para "passar".

## Comandos (na raiz do repositório)

| Comando | O que faz |
|---|---|
| `npm run dev -w api` | API em modo de desenvolvimento (lê o `api/.env`; reinicia ao salvar) |
| `npm run build -w api` / `npm run start -w api` | compila para `api/dist` / roda a versão compilada |
| `npm test -w api` | testes unitários (sem Docker; é o que o `pre-push` roda) |
| `npm run test:integration -w api` | integração com PostgreSQL real (Testcontainers; precisa do Docker ligado) |
| `npm run test:perf -w api` | performance: API compilada num processo, carga noutro, contra o `docker-compose` (não roda no CI) |
| `npm run test:coverage -w api` | unitários + integração, com cobertura (falha abaixo de 90% em `src/modules/**`, `src/plugins/**` e `src/shared/**`) |
| `npm run lint -w api` / `npm run typecheck -w api` | ESLint strict + segurança / `tsc --noEmit` |
| `npm run db:migrar -w api` / `npm run db:aplicar -w api` | cria e aplica migration no desenvolvimento (`prisma migrate dev`) / só aplica as existentes (`prisma migrate deploy`, o da produção) |
| `npm run db:gerar -w api` | gera o cliente do Prisma em `src/generated/` (também roda sozinho no `npm ci`) |
| `npm run seed -w api` / `npm run seed:perf -w api` | dados de exemplo / 10 mil produtos fictícios |
| `npm run audit -w api` | `npm audit --audit-level=high` + `npm audit signatures` |
| `npm run db:subir -w api` / `npm run db:descer -w api` | PostgreSQL 17 (porta 5433) + Mailpit (SMTP 1025, página 8025) locais; exige o `api/.env` |

Os comandos acima existem desde a Fase 0 (spec `specs/000-fundacao`), menos `seed` e `seed:perf`, que chegam com os produtos (Fases 3 e 4). O `test:perf` só mede algo a partir da Fase 4, quando existir a busca.

## Fluxo por funcionalidade

1. `spec-writer` cria a spec com a skill `/sdd-feature`.
2. `security-reviewer` faz o threat model e `performance-reviewer` revisa o plano de dados.
3. **Resumo para o responsável e espera da aprovação.**
4. Para cada tarefa: `test-writer` escreve o teste que falha, você implementa e depois refatora (`/tdd-cycle`).
5. `/review-gate` com os quatro revisores **ao fim de cada bloco de tarefas** (no mínimo, ao fim da funcionalidade), e não a cada tarefa. Corrija todo Crítico e Alto e rode de novo. (Decisão do responsável em 23/11/2026: revisar a cada tarefa pequena custava caro e achava pouco.)
6. Atualize a documentação, o OpenAPI e o `CHANGELOG.md`.
7. Commits pequenos (Conventional Commits) e um resumo curto do que foi entregue e do que ficou pendente.

## Definition of Done (toda tarefa)

- [ ] Critérios de aceite cobertos por testes que passam.
- [ ] Teste escrito antes do código (visível no histórico).
- [ ] Cobertura ≥ 90% no módulo; lint, format e `tsc --noEmit` limpos.
- [ ] Matriz de autorização atualizada e verde.
- [ ] `review-gate` do bloco aprovado (sem Crítico nem Alto).
- [ ] Dependência nova registrada em `docs/dependencias.md`; `npm audit` sem alto nem crítico.
- [ ] Queries novas com `EXPLAIN` revisado; metas de performance respeitadas.
- [ ] OpenAPI, `README`, `.env.example` e `CHANGELOG.md` atualizados.
