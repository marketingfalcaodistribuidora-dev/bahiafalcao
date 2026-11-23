# API do catálogo Falcão (`api/`)

Backend do catálogo online da Falcão Distribuidora (autopeças para linha pesada, Feira de Santana, BA): Fastify, Zod, Prisma e PostgreSQL, em TypeScript estrito.

- **Regras de negócio:** [`docs/especificacao.md`](../docs/especificacao.md).
- **Regras do código:** [`api/CLAUDE.md`](./CLAUDE.md).
- **O que existe, como e por quê:** [`docs/aplicacao/api-fundacao.md`](../docs/aplicacao/api-fundacao.md).

## Começar

Pré-requisitos: Node 26.13.1 (`.nvmrc`), npm 11.20 ou mais novo, Docker Desktop e gitleaks (`winget install --id Gitleaks.Gitleaks --version 8.30.1 --exact`).

1. Na raiz do repositório, rode `npm ci`. Ele também gera o cliente do Prisma.
2. Copie `api/.env.example` para `api/.env`. Escolha uma senha (só letras e números) e escreva-a em `POSTGRES_SENHA` e no lugar de `COLOQUE_A_SENHA` na `DATABASE_URL`.
3. Suba o banco e o Mailpit: `npm run db:subir -w api`.
4. Aplique as migrations: `npm run db:aplicar -w api`.
5. Rode a API: `npm run dev -w api`. Ela responde em http://127.0.0.1:3333/health/live.

## Comandos (na raiz do repositório)

| Comando | O que faz |
|---|---|
| `npm run dev -w api` | API em desenvolvimento (lê o `api/.env`; reinicia ao salvar) |
| `npm run build -w api` / `npm run start -w api` | Compila para `api/dist` / roda a versão compilada |
| `npm test -w api` | Testes unitários (sem Docker) |
| `npm run test:integration -w api` | Testes com PostgreSQL real (Testcontainers; precisa do Docker) |
| `npm run test:coverage -w api` | Os dois, com cobertura mínima de 90% |
| `npm run lint -w api` / `npm run typecheck -w api` | ESLint estrito / TypeScript |
| `npm run db:subir -w api` / `npm run db:descer -w api` | PostgreSQL (porta 5433) e Mailpit (http://127.0.0.1:8025) locais |
| `npm run db:migrar -w api` / `npm run db:aplicar -w api` | Cria e aplica migration / só aplica as existentes |
| `npm run check` | Portão completo do site e da API (formatação, lint, tipos, testes e build) |

## Rotas

| Rota | Acesso | O que devolve |
|---|---|---|
| `GET /health/live` | público | `{ "status": "ok" }`: o processo está de pé |
| `GET /health/ready` | público | `{ "status": "ok", "banco": "ok" }`, ou 503 se o banco não responder em 1 s |

Toda falha vem no formato `{ "erro": "codigo_maquina", "mensagem": "texto para pessoas", "campos": { … } }`.

## Banco e conexões

Dois pools, cada um com o seu cliente do Prisma:

| Pool | Usado por | Consulta cortada em | Conexões | Espera por conexão |
|---|---|---|---|---|
| público | rotas do catálogo | 2 s | até 10 | 2 s (depois, 503) |
| administração | rotas da administração | 5 s | até 5 | 2 s (depois, 503) |

Conta do tamanho: conexões ≈ requisições simultâneas × tempo da consulta ÷ tempo da requisição. Para 20 simultâneas, com consultas de ~20 ms e requisições de ~60 ms, dá cerca de 7. A medição da Fase 4 confirma ou ajusta.

## Domínio em produção (decisão D1, ainda aberta)

A API vai para uma VPS da Hostinger. A escolha entre as duas opções abaixo fica para a Fase 7. Nas duas, a API escuta só em `127.0.0.1` e quem fala com a internet é o Caddy.

| | `bahiafalcao.com.br/api` (mesmo domínio) | `api.bahiafalcao.com.br` (subdomínio) |
|---|---|---|
| Caminho da requisição | Navegador → Vercel (site, com *rewrite* de `/api`) → Caddy na VPS → API | Navegador → Caddy na VPS → API |
| `CORS_ORIGENS` | Vazia: o navegador chama o mesmo domínio, sem CORS | `https://bahiafalcao.com.br,https://www.bahiafalcao.com.br` |
| Cookie da sessão (Fase 1) | `__Host-sessao`, `HttpOnly`, `Secure`, `SameSite=Lax`, sem `Domain` | O mesmo `__Host-sessao`, sem `Domain`: fica preso a `api.bahiafalcao.com.br`, que é quem lê. Os dois endereços são do mesmo site, então `SameSite=Lax` vale e o front chama com `credentials: "include"` |
| `TRUST_PROXY` | IP do Caddy (ex.: `127.0.0.1`). A Vercel **não tem IPs fixos**, então o Caddy não pode confiar nela pelo endereço. Para repassar o IP real, o site acrescenta um cabeçalho secreto no *rewrite* e o Caddy só aceita `/api` com ele; sem isso, o limite por IP passa a ver só a Vercel | IP do Caddy (ex.: `127.0.0.1`). O Caddy recebe o cliente direto e repassa o IP |
| Prós | Sem CORS | Caminho mais curto (menos latência); o IP real chega sem depender da Vercel |
| Contras | Uma camada a mais; IP real depende do cabeçalho secreto | CORS exato para os dois endereços do site |

## Segurança

- Configuração validada no início; com qualquer problema, a API não sobe.
- Toda rota declara quem a acessa e o schema de resposta; sem isso, a API não sobe.
- Cabeçalhos de segurança, CORS exato, limite de requisições e IP real só do proxy confiável.
- Logs sem senha, token, cookie, authorization ou query string.
- Cadeia de suprimentos: versões exatas, nada com menos de 7 dias, scripts de instalação só os liberados, conferência de cada pacote novo no CI. Veja [`docs/dependencias.md`](../docs/dependencias.md).
