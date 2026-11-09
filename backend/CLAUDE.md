# Backend (reservado)

Ainda não existe código aqui. A pasta está reservada para quando o site precisar de:

- catálogo de produtos (mais de 7 mil itens) com páginas indexáveis;
- painel para a equipe editar dados da empresa e conteúdo;
- formulários (orçamento, contato) com armazenamento;
- integrações (ERP, estoque, e-mail).

## Antes de começar

1. Use o agente `backend-architect` para propor a arquitetura. **A escolha de stack é do usuário.** Avalie primeiro se Route Handlers ou Server Actions do próprio Next.js bastam.
2. Ao criar o pacote, adicione `"backend"` em `workspaces` no `package.json` da raiz e scripts equivalentes (`dev`, `build`, `lint`, `typecheck`, `test`).
3. Mantenha `backend/.env.example` atualizado; segredos só em `.env.local` ou no provedor de hospedagem.
4. Peça ao agente `security-auditor` uma revisão antes de expor qualquer rota pública.

## Estrutura sugerida

```
backend/
  src/
    modules/<dominio>/   rotas, serviço, repositório e validação
    shared/              erros, logger, middlewares
    config/              variáveis de ambiente validadas
  tests/
  .env.example
```
