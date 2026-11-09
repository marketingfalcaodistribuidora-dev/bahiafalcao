# Constituição do projeto: Falcão Distribuidora

Princípios **inegociáveis** que toda especificação, plano e implementação precisa respeitar. Inspirada no modelo de constituição do [GitHub spec-kit](https://github.com/github/spec-kit) e adaptada a este projeto.

Para mudar um artigo, é preciso aprovação explícita do responsável pelo projeto, registrada no histórico abaixo.

---

## Artigo I: Especificação antes do código (SDD)
Funcionalidades novas, mudanças com mais de um arquivo ou qualquer coisa ligada a backend começam por uma especificação em `specs/NNN-nome/spec.md`. Uma spec responde **o quê** e **por quê**, nunca **como**. Ambiguidades são marcadas com `[PRECISA ESCLARECER: pergunta]`, nunca adivinhadas.

## Artigo II: Testes primeiro (TDD), INEGOCIÁVEL
Nenhum código de produção com lógica é escrito sem antes existir um teste que falhou pelo motivo esperado. Ciclo obrigatório: **Vermelho → Verde → Refatorar**. Código escrito antes do teste é descartado e refeito a partir do teste.

Exceções, que exigem aprovação: protótipos descartáveis, arquivos de configuração e conteúdo puramente estático (texto e estilo) sem lógica.

## Artigo III: Testes como o Google
- Testar **comportamentos** pela **API pública** (o que o usuário vê e faz), não detalhes de implementação.
- Verificar **estado e resultado**, não interações; mocks apenas para fronteiras externas (rede, tempo).
- Estrutura **dado / quando / então**, nomes que descrevem o comportamento, sem lógica dentro do teste e com preferência por **DAMP** em vez de DRY.
- Pirâmide de testes de cerca de **70% pequenos** (unitários, um processo), **20% médios** (integração, uma máquina) e **10% grandes** (ponta a ponta).

## Artigo IV: Simplicidade
A solução mais simples que atende à spec. Sem abstrações especulativas (YAGNI). Use os recursos do framework diretamente (Next.js, React, Tailwind) em vez de criar camadas próprias. Toda complexidade extra é justificada no plano, na seção "Complexidade justificada".

## Artigo V: SEO é requisito
Toda página pública tem title e description únicos, canonical, um único `h1`, imagens via `next/image` com `alt`, entrada no sitemap e dados estruturados coerentes. Metas de Core Web Vitals: **LCP < 2,5 s, INP < 200 ms, CLS < 0,1**.

## Artigo VI: Fonte única de dados
Dados da empresa (nome, endereço, telefone, WhatsApp, horários) vivem apenas em `frontend/src/lib/site.ts`. O NAP é idêntico ao Perfil da Empresa no Google.

## Artigo VII: Segurança e LGPD
Segredos só em variáveis de ambiente, nunca em `NEXT_PUBLIC_*`. Toda entrada é validada no servidor. Dados pessoais só com finalidade clara e consentimento quando aplicável.

## Artigo VIII: Acessibilidade
HTML semântico, navegação por teclado, foco visível, contraste AA, alvos de toque com pelo menos 44px e respeito a `prefers-reduced-motion`.

## Artigo IX: Fidelidade ao design
Interfaces seguem `docs/design/`. Desvios são registrados na spec ou no plano com o motivo.

---

## Histórico de alterações
| Data | Artigo | Mudança | Aprovado por |
|---|---|---|---|
| 2026-11-09 | Todos | Versão inicial | Responsável pelo projeto |
