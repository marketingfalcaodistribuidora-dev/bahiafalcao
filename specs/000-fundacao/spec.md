# Spec 000: Fundação da API do catálogo

- **Status:** Aprovada (19/11/2026)
- **Criada em:** 2026-11-19 · **Revisada em:** 2026-11-19, duas rodadas do `security-reviewer` e do `performance-reviewer` (veja o §9); reorganizada em 2026-11-23 (veja o §8)
- **Fonte:** `PROMPT_BACKEND_FALCAO.md` (seções 3, 5, 6, 7 e 11, Fase 0) e `docs/especificacao.md` (seções "Modelo de dados e API" e "Requisitos não funcionais")

> O **quê** e o **porquê**. O como fica no [plan.md](./plan.md).

## 1. Objetivo

Deixar pronta a base em que todas as funcionalidades do catálogo serão construídas:
- um servidor que sobe só com configuração válida;
- respostas e erros num formato único;
- logs que não vazam dados;
- proteções de segurança ligadas desde o primeiro dia;
- contrato OpenAPI;
- testes com banco real e rápidos;
- medição de performance confiável;
- uma esteira (ganchos locais e CI) que barra código sem teste, dependência insegura e segredo vazado.

Sem isso, cada funcionalidade reinventaria essas peças, de jeitos diferentes. A Fase 0 não entrega nenhuma tela nem regra do catálogo ao cliente.

## 2. Regras

| # | Regra | Fonte |
|---|---|---|
| RN1 | Erros sempre como `{ "erro": "codigo_maquina", "mensagem": "texto para pessoas", "campos": { … } }`. | especificação, "Modelo de dados e API"; prompt 6 |
| RN2 | Nunca vazar stack trace, SQL ou detalhe interno numa resposta ou num log aberto. | prompt 6 e 7.1 |
| RN3 | Configuração só por variáveis de ambiente validadas; com algo inválido, o servidor não sobe. Na dúvida, o padrão é o mais fechado. | prompt 6 e 7.1 |
| RN4 | Logs com identificador de requisição, sem senha, token, cookie, `authorization` nem query string. | prompt 6 |
| RN5 | Toda rota declara quem pode acessá-la e o formato da resposta. Rota sem essas declarações não sobe. Enquanto o login não existe (Fase 1), qualquer rota não pública recusa o acesso. | prompt 4.2, 6 e 7.1 |
| RN6 | API só JSON; CORS com lista exata de origens; cabeçalhos de segurança (HSTS, `nosniff`, CSP). | prompt 7.1; especificação, "Requisitos não funcionais" |
| RN7 | O IP do cliente (limite de taxa, logs, auditoria futura) só vem de um proxy declarado como confiável. | prompt 7.1 (rate limit por IP) e 6 (auditoria com IP) |
| RN8 | Contrato OpenAPI 3.1 gerado dos mesmos schemas que validam as requisições; `/docs` fechado por padrão. | prompt 6 |
| RN9 | Busca e códigos ignoram acentos, maiúsculas, espaços, pontos, hífens e barras ("hfcm-2313" = "HFCM 2313"). A Fase 0 entrega a normalização e a base do banco para isso. | especificação, "Regras da busca", item 2; prompt 7.2 |
| RN10 | Paginação com teto: 24 no catálogo público, 25 na administração. | especificação, "Telas públicas" e "Paginação"; prompt 7.2 |
| RN11 | Toda dependência passa pelo protocolo de cadeia de suprimentos, com versão exata e registro. | prompt 5 |
| RN12 | Metas de performance são medidas com concorrência real e registradas em `docs/perf/`. | prompt 7.2 |

## 3. Fora de escopo

- Qualquer tabela do catálogo ou de usuários (Fase 1 em diante).
- Login, sessões, CSRF, papéis de verdade e o **log de segurança separado** (Fase 1). A Fase 0 entrega o **mecanismo** que exige a declaração de acesso e recusa o que ainda não pode ser verificado.
- O `seed:perf` de 10 mil produtos (Fase 4, quando existirem as tabelas). A Fase 0 entrega o medidor e o modelo de registro.
- Compressão (Fase 4); Dockerfile, Trivy, deploy e backup (Fase 7).
- O front do catálogo.

## 4. Critérios de aceite

### Configuração e ciclo de vida
- **CA1.1:** Dado que falta uma variável obrigatória (incluindo `NODE_ENV`) ou ela tem formato inválido, quando o servidor inicia, então ele não sobe, e a mensagem lista **o nome** de cada variável com problema, **sem mostrar o valor**.
- **CA1.2:** Dado um ambiente válido, quando o servidor inicia, então responde em `/health/live` com 200.
- **CA1.3:** Dado o banco acessível, quando alguém chama `/health/ready`, então recebe 200. Dado o banco fora do ar (ou sem resposta em 1 s), recebe **503** `indisponivel`, sem detalhe do erro. Chamadas repetidas dentro de 2 s reaproveitam o último resultado, sem ir ao banco, e chamadas simultâneas esperam a mesma consulta, em vez de abrir uma cada.
- **CA1.4:** Dado uma requisição em andamento, quando o servidor recebe SIGTERM, então para de aceitar conexões novas, termina a requisição, desconecta do banco e encerra com código 0.
- **CA1.5:** Dado o pool de conexões esgotado, quando uma requisição espera mais de 2 s por uma conexão, então recebe 503 `indisponivel`, sem ficar presa até o tempo máximo da requisição.

### Formato único de erro
- **CA2.1:** Dado uma rota que não existe, quando alguém a chama, então recebe 404 `nao_encontrado`. Essas respostas também contam no limite de taxa.
- **CA2.2:** Dado uma rota com schema, quando chega um campo inválido, então a resposta é 400 `validacao`, com `campos` indicando cada campo com problema, em português.
- **CA2.3:** Dado um corpo com campo desconhecido, ou com `__proto__` ou `constructor`, quando chega, então é recusado com 400.
- **CA2.4:** Dado um erro inesperado dentro de uma rota, quando ele acontece, então a resposta é 500 `erro_interno` com mensagem neutra, sem stack trace, SQL ou nome de tabela. O log registra o tipo do erro com o `requestId`.
- **CA2.5:** Dado um erro de unicidade do banco (Prisma P2002), quando ele acontece, então vira 409 `conflito`, com o campo em `campos` quando der para saber qual é.
- **CA2.6:** Dado um corpo maior que o limite da rota, então a resposta é 413 `muito_grande`. Dado um `Content-Type` que não é JSON numa rota JSON, a resposta é 415 `tipo_nao_suportado`.

### Rastreabilidade e logs
- **CA3.1:** Dado uma requisição sem `x-request-id`, quando é respondida, então a resposta traz um gerado. Dado um `x-request-id` válido (até 128 caracteres seguros) vindo do proxy confiável, ele é mantido. Fora isso, é trocado por um gerado.
- **CA3.2:** Dado uma requisição com `authorization`, `cookie`, query string (ex.: `?token=…`) ou corpo com `senha`, `token` ou campos aninhados com esses nomes, e uma resposta com `set-cookie`, quando forem registradas no log, então nenhum desses valores aparece. O log da requisição tem só método, rota sem query, status, tempo e `requestId`.

### Segurança das respostas
- **CA4.1:** Dado qualquer resposta JSON, então ela traz:
  - `Strict-Transport-Security`;
  - `X-Content-Type-Options: nosniff`;
  - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`;
  - `Cache-Control: no-store`, a menos que a rota declare outro cache (rotas públicas da Fase 4);
  - `Content-Type: application/json`.
- **CA4.2:** Dado uma origem da lista permitida, quando ela faz uma requisição com credenciais, então recebe `Access-Control-Allow-Origin` com a própria origem (nunca `*`), `Access-Control-Allow-Credentials: true` e `Vary: Origin`. Dado uma origem fora da lista, `Origin: null` ou um domínio que só começa igual (`https://bahiafalcao.com.br.exemplo.com`), não recebe nenhum cabeçalho de CORS.
- **CA4.3:** Dado muitas requisições do mesmo cliente acima do limite geral, quando o limite passa, então a resposta é 429 `muitas_requisicoes`, com `Retry-After`.
- **CA4.4:** Dado o código-fonte da API, quando o lint e o CI rodam, então `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.raw(`, `eval`, `new Function` e `any` são barrados.
- **CA4.5:** Dado uma requisição com `X-Forwarded-For` vinda de um endereço que **não** está na lista de proxies confiáveis, quando o servidor identifica o cliente, então usa o endereço da conexão e ignora o cabeçalho. Vinda do proxy confiável, usa o IP informado. A lista é de IPs ou faixas (CIDR) configurada por variável; o padrão é não confiar em ninguém, e "confiar em todos" ou "um número de saltos" são recusados no boot.
- **CA4.6:** Dado a lista de origens do CORS na configuração, quando o servidor inicia, então recusa `*`, `null`, origens sem `https://` e qualquer valor que não seja uma origem exata (sem barra no fim, caminho nem maiúsculas). A única exceção é `http://localhost:<porta>` com `NODE_ENV=development`.
- **CA4.7:** Dado `NODE_ENV=production`, quando o servidor inicia, então recusa a configuração que dispensa o limite de taxa para algum endereço (usada só na medição de performance).

### Contrato e acesso
- **CA5.1:** Dado `NODE_ENV=development` ou `DOCS_HABILITADO=true` fora de produção, quando alguém abre `/docs`, então vê o OpenAPI 3.1 gerado dos schemas, com CSP própria. Em qualquer outro caso, `/docs` e os arquivos dele respondem 404. Até a Fase 1 (quando `/docs` passa a exigir Administrador), `DOCS_HABILITADO=true` com `NODE_ENV=production` é recusado no boot.
- **CA5.2:** Dado uma rota registrada sem declarar quem pode acessá-la **ou** sem schema de resposta, quando o servidor sobe (inclusive nos testes), então falha citando a rota. Rotas criadas por plugins (`OPTIONS` do CORS, `HEAD` automático, arquivos do `/docs`) também têm acesso explícito; as que não têm schema de resposta (o `OPTIONS` do CORS e o HTML e os arquivos do `/docs`) ficam numa **lista fechada** de exceções, por método e URL exatos, testada.
- **CA5.3:** Dado as rotas existentes, quando o teste de contrato roda, então cada resposta real é válida contra o OpenAPI gerado.
- **CA5.4:** Dado o OpenAPI gerado, quando o comando de contratos roda, então os tipos TypeScript ficam em `api/contracts/`.
- **CA5.5:** Dado uma rota que declara um acesso diferente de "público", quando alguém a chama antes da Fase 1, então recebe 401 `nao_autenticado`. A matriz de autorização (anônimo, editor, administrador, desativado, sessão expirada) cobre todas as rotas.
- **CA5.6:** Dado uma rota cujo código devolve um campo que não está no schema de resposta, quando ela responde, então o campo não sai na resposta.

### Normalização e paginação
- **CA6.1:** Dado " HFCM-23.13/ ", "hfcm 2313" e "HFCM2313", quando normalizados como código, então os três dão "hfcm2313". Zeros à esquerda são mantidos ("0103" → "0103").
- **CA6.2:** Dado "Ação Mecânica", quando normalizado como texto de busca, então dá "acao mecanica".
- **CA6.3:** Dado o banco migrado, quando se consulta `f_unaccent('Ação')`, então o resultado é "Acao", também com o `search_path` reduzido ao mínimo. A função é `IMMUTABLE` e pode ser usada num índice GIN trigram.
- **CA6.4:** Dado um pedido com `limite` acima do teto (24 público, 25 administração), zero, negativo ou não numérico, ou com `pagina` acima do máximo, quando validado, então é recusado com 400 `validacao`.
- **CA6.5:** Dado uma tabela de caracteres acentuados e especiais do português (incluindo º, ª, °, ç), quando normalizados no código e no banco, então os dois lados dão o mesmo resultado.

### Esteira de qualidade e cadeia de suprimentos
- **CA7.1:** Dado o npm mais antigo que 11.20.0, quando alguém instala, então a instalação falha. Dado um pacote com menos de 7 dias ou com script de instalação fora da lista, a instalação falha. Como o `npm ci` instala o lockfile sem conferir a idade, todo PR que **altera o lockfile** (inclusive os do Dependabot) passa pela conferência de cada pacote novo ou alterado (idade, scripts de instalação, OSV) contra o lockfile da `main`, e falha no primeiro problema. O CI confere que essas proteções estão ativas, e nenhum script do projeto ou do CI usa `--ignore-scripts` nem `--dangerously-allow-all-scripts`.
- **CA7.2:** Dado um `package.json` (raiz, `frontend/` ou `api/`) com `^` ou `~`, quando o CI roda, então falha.
- **CA7.3:** Dado um push ou PR, quando o CI roda, então executa:
  - lint, tipos e testes com cobertura (falha abaixo de 90% em `src/modules/**`, `src/plugins/**` e `src/shared/**`);
  - `npm audit --audit-level=high` e `npm audit signatures`;
  - gitleaks com o histórico inteiro, e Semgrep;
  - SBOM CycloneDX.
  - Qualquer falha bloqueia.
- **CA7.4:** Dado um commit com um segredo, quando o gancho `pre-commit` roda, então o commit é barrado pelo gitleaks. Sem o gitleaks instalado, o commit também é barrado, com a instrução de instalação.
- **CA7.5:** Dado arquivos preparados para commit, quando o `pre-commit` roda, então só eles passam por formatação e lint.
- **CA7.6:** Dado os workflows do GitHub, então toda action está fixada por SHA, o workflow declara `permissions: contents: read` e o checkout não guarda credenciais.

### Medição de performance
- **CA8.1:** Dado a API compilada rodando **num processo próprio** contra o banco do `docker-compose`, quando o comando de performance roda **noutro processo**, então ele faz aquecimento e mede por uma duração fixa (30 s) com **20 conexões simultâneas reais** (sockets, não simulação), abortando se alguma resposta não for 2xx. Ele grava em `docs/perf/` p50, p95 e p99, o atraso do event loop e os dados do ambiente: data, commit, CPU, sistema, versões do Node e do PostgreSQL, concorrência e duração.
- **CA8.2:** Dado `/health/live` e `/health/ready`, quando medidos assim, então p95 < 20 ms e < 50 ms, respectivamente.
- **CA8.3:** Dado uma rota que fala com o banco, quando o teste conta as consultas, então sabe quantas queries ela fez. Esse auxiliar é usado nos testes de N+1 das fases seguintes.

## 5. Requisitos de segurança e performance

- **Segurança:** OWASP ASVS nível 2 nas partes que a Fase 0 toca:
  - configuração, erros, logs e cabeçalhos;
  - CORS, IP do cliente, limites de corpo e de taxa;
  - cadeia de suprimentos e CI.
  - Nenhum segredo no Git (o histórico inteiro é varrido uma vez).
- **Performance:**
  - metas do CA8.2;
  - timeouts de conexão, de espera por conexão do pool e de consulta configurados;
  - suíte de testes rápida o bastante para rodar a cada commit (banco por arquivo copiado de um modelo, sem rodar as migrations de novo).

## 6. Decisões em aberto ligadas a esta spec

- **D1:** hospedagem e domínio. A Fase 0 documenta as duas opções de domínio e a configuração de CORS, cookie e proxy confiável de cada uma.
- **D10:** ganchos sem Husky.
- **D11:** TypeScript 5.9.3.
- **D12:** scripts de instalação pelo mecanismo nativo do npm.
- **D15:** Node 26 no CI.
- **D16:** `/docs` fechado por padrão.
- **D17:** gitleaks obrigatório no `pre-commit`.
- **D18:** versões exatas também no site.
- **D19:** proteção da branch `main` no GitHub.
- **D20:** medidor próprio no lugar do autocannon/k6 na Fase 0.

Todas estão em `docs/decisoes-em-aberto.md`.

## 7. Checklist de spec pronta

- [x] Toda regra cita a fonte.
- [x] Nenhuma regra inventada; dúvidas em `docs/decisoes-em-aberto.md`.
- [x] Critérios cobrem caminho feliz, validação, acesso, concorrência (desligamento, pool esgotado), limites e falhas externas (banco fora).
- [x] Metas de segurança e de performance com número.
- [x] Cada migration tem justificativa e rollback (no plano).
- [x] STRIDE sem ameaça sem mitigação (no plano).
- [x] Todo critério tem teste e tarefa.
- [x] Revisores de segurança e de performance: **APROVADO** na segunda rodada (sem Crítico nem Alto); Médios e Baixos incorporados (§9).
- [x] Aprovada pelo responsável (19/11/2026).

## 8. Reorganização de 23/11/2026

A pedido do responsável, a fundação ficou só com o que é preciso antes da Fase 1. Estes critérios continuam valendo, mas são cumpridos na fase que usa cada coisa (detalhes no [tasks.md](./tasks.md#adiado-para-a-fase-que-usa)):

| Critérios | Vai para |
|---|---|
| CA6.1, CA6.2, CA6.4, CA6.5 (normalização, paginação, equivalência código × banco) | Fase 3 |
| CA5.1, CA5.3, CA5.4 (`/docs`, contrato OpenAPI e tipos) | Fase 4 |
| CA8.1, CA8.2 (medidor e metas de performance do `/health`) | Fase 4 |
| Parte do CA7.3 (Semgrep, SBOM, gitleaks do histórico no CI) | Fase 7 |

O `review-gate` passa a rodar por bloco de tarefas, e não a cada tarefa.

## 9. Revisão de 19/11/2026

| Revisor | Achado | Severidade | Onde foi tratado |
|---|---|---|---|
| security | IP real atrás de proxy (`trustProxy`) | Alto | RN7, CA4.5, plano §3 e §6 |
| security | `/health/ready` público batendo no banco | Médio | CA1.3 (cache de 2 s, 1 s de limite) |
| security | Rota não pública aberta antes da Fase 1; rotas de plugins | Médio | CA5.2, CA5.5 |
| security | `/docs` dependente só de `NODE_ENV` | Médio | CA1.1, CA5.1 |
| security | `set-cookie`, query string e campos aninhados no log | Médio | CA3.2 |
| security | CORS: `null`, domínio que só começa igual, lista sem validação | Médio | CA4.2, CA4.6 |
| security | Actions por tag, sem `permissions`, sem proteção da branch, gitleaks sem histórico | Médio | CA7.3, CA7.6, D19 |
| security | Proteções do npm verificadas só à mão | Médio | CA7.1 |
| security | Cobertura só em `src/modules/**` | Médio | CA7.3 |
| security | `allowScripts` incompleto | Médio | plano §2 |
| security | `check-dep.sh` sem dependências indiretas e sem validar o nome | Médio / Baixo | plano §8, tarefa T006 |
| security | CSP e `no-store` no JSON, limite no 404, `Prisma.raw`, `x-request-id` só do proxy | Baixo | CA4.1, CA2.1, CA4.4, CA3.1 |
| security | `^` no site e na raiz | Baixo | CA7.2, D18 |
| performance | Schema por arquivo não funciona com migrations; suíte lenta | Alto | plano §7 (banco por arquivo a partir de um modelo) |
| performance | Perf com `app.inject` não mede; falta a estrutura de medição | Alto | CA8.1, CA8.2, plano §7 |
| performance | `f_unaccent` sem schema explícito | Médio | CA6.3, plano §4 |
| performance | Pool sem tempo de espera | Médio | CA1.5, plano §4 |
| performance | `statement_timeout` por rota | Médio | plano §4 (dois pools) |
| performance | `requestTimeout` não limita o handler | Médio | plano §3 |
| performance | Limite de taxa atrapalha o teste de carga | Médio | CA4.7, plano §3 |
| performance | Serialização pelo schema de resposta | Médio | CA5.2, CA5.6 |
| performance | Contagem de queries, contrato do seed, `pg_stat_statements` | Médio | CA8.3, plano §4 e §7 |
| performance | Normalização dupla (código × banco) | Médio | CA6.5 |
| performance | `pagina` sem máximo, atraso do event loop | Baixo | CA6.4, CA8.1 |
| **2ª rodada:** security | `TRUST_PROXY` com número de saltos confia em qualquer origem | Médio | CA4.5, plano §3 |
| 2ª rodada: security | `redact` do Pino não casa parte do nome nem qualquer profundidade | Médio | plano §3 (serializer que percorre o objeto) |
| 2ª rodada: security | Rotas de plugins sem schema de resposta × regra do boot; ordem do `onRoute` | Médio | CA5.2, plano §3 |
| 2ª rodada: security | `--ignore-scripts` proibido × `check-lock.sh` | Médio | plano §8, skill `dependency-check` |
| 2ª rodada: security | `min-release-age` não vale para lockfile já fixado | Médio | CA7.1, plano §9 |
| 2ª rodada: security | `localhost`, `DOCS_HABILITADO` em produção, *single-flight* do ready, `gitleaks git`, cobertura no `api/CLAUDE.md`, `hasInstallScript`, conferência da proteção da `main`, Node 26 na Vercel | Baixo | CA4.6, CA5.1, CA1.3, plano §2/§8/§9, tarefas T001/T006/T029 |
| 2ª rodada: performance | Medidor no mesmo processo da API | Médio | CA8.1, plano §7 |
| 2ª rodada: performance | Teste do pool esgotado em corrida com o `statement_timeout` | Médio | plano §7 (pool próprio segurado no teste) |
| 2ª rodada: performance | Banco-modelo sem conexões, `DROP … WITH (FORCE)`, locale fixo, NFKD, schema de resposta sem `.strict()`, `contarQueries` nos dois clientes, detalhes do medidor, justificativa da `f_unaccent` | Baixo | plano §3, §4 e §7 |
