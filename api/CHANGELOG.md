# Histórico de mudanças da API

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). As datas são de 2026.

## [0.1.0] - Fundação (Fase 0, spec 000), 23/11

### Adicionado

- Projeto `api/` (Fastify 5, Zod 4, Prisma 7, PostgreSQL 17) em TypeScript estrito, com lint que barra `any`, SQL montado com texto, `eval` e `new Function`.
- Configuração validada no início (`src/config/env.ts`): a API não sobe com variável faltando ou inválida, e a mensagem cita só os nomes.
- Banco com dois pools (público e administração), limites de tempo próprios e tradução dos erros do banco.
- Migration `20261123180000_extensoes`: `unaccent`, `pg_trgm` e `f_unaccent`.
- Formato único de erro, `x-request-id` e logs sem dados sensíveis.
- Cabeçalhos de segurança, CORS exato, limite de requisições e IP real só do proxy confiável.
- Acesso obrigatório em toda rota e matriz de autorização.
- Rotas `GET /health/live` e `GET /health/ready`, servidor e desligamento gracioso.
- Ambiente local em Docker (PostgreSQL e Mailpit), testes com PostgreSQL real (Testcontainers) e cobertura mínima de 90%.
- Esteira: `pre-commit` com gitleaks e lint-staged; CI com conferência da cadeia de suprimentos (check-lock antes do `npm ci`, audit, assinaturas, gitleaks, workflows fixados por SHA); Dependabot com espera de 7 dias.
- Desligamento com limite de 8 s (`src/desligamento.ts`) e o script `npm run audit -w api`.

### Corrigido (review-gate da fundação)

- O 401 das rotas não públicas passa pelos cabeçalhos de segurança, pelo CORS e pelo limite de requisições.
- O check-lock confere o lockfile inteiro (forma, registro, integridade sha512, versão), exige o tarball do próprio pacote, não confia na marca `inBundle` e pega o mesmo `nome@versão` com outro conteúdo.
- Banco fora do ar, reiniciando, cheio, com a conexão caída ou com a consulta cortada por tempo responde 503, e não 500.
- O log de erro inesperado leva os códigos do erro e não leva a mensagem, nem quando ela tem várias linhas ou imita a pilha. O log registra o molde da rota, e não os valores do caminho.
- Rota sem resposta 2xx declarada e `TRUST_PROXY` com faixa larga demais (inclusive no IPv4 mapeado) impedem a API de subir.
- A conferência dos workflows (CA7.6) virou um módulo testado: ignora comentários só fora de aspas, recusa permissão de escrita em qualquer formato, action sem SHA em qualquer lugar da linha, escapes `\u`/`\x` e os gatilhos `pull_request_target` e `workflow_run`.
- Conexões com o banco: sessão parada numa transação por 10 s é encerrada; erro numa conexão ociosa vai para o log em vez de derrubar o processo; porta ocupada fecha o banco.
