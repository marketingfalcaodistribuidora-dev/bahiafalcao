# Plano 001: Página de links para o Instagram

- **Spec:** [spec.md](./spec.md)
- **Status:** Aprovado

## 1. Portões da constituição
| Artigo | Atende? | Observação |
|---|---|---|
| II: Testes primeiro | ☑ | Testes da página e dos metadados escritos antes |
| III: Testes como o Google | ☑ | Testing Library pela visão do usuário (papéis e nomes acessíveis) |
| IV: Simplicidade | ☑ | Uma página estática, sem banco de dados e sem painel |
| V: SEO | ☑ | `noindex, follow`, canonical `/links`, fora do sitemap |
| VI: Fonte única de dados | ☑ | Links e contatos vêm de `lib/site.ts` |
| VII: Segurança e LGPD | ☑ | Nenhum dado coletado; links externos com `rel="noopener"` |
| VIII: Acessibilidade | ☑ | Botões ≥ 48 px, `aria-label` nos ícones, foco visível |
| IX: Fidelidade ao design | ☑ | Mesmos tokens de cor e fontes do site (não há design específico) |

## 2. Abordagem técnica
- **Rota:** `frontend/src/app/links/page.tsx` (Server Component, estático).
- **Separar layouts com route groups:** a página inicial passa para `app/(site)/`, com um layout próprio que contém Cabeçalho, Rodapé e botões flutuantes. A página `/links` fica **sem** esses elementos, como uma página de links tradicional. O `app/layout.tsx` raiz mantém `html`, fontes, metadados globais e JSON-LD.
- **Dados novos em `site.ts`:** TikTok e o link do Perfil da Empresa no Google (`maps.app.goo.gl/...`), além da mensagem de WhatsApp "vim pelo Instagram".
- **Ícone novo:** TikTok em `ui/icons.tsx`.

## 3. Arquivos afetados
| Arquivo | Ação |
|---|---|
| `app/page.tsx` → `app/(site)/page.tsx` | mover |
| `app/(site)/layout.tsx` | criar (Header, Footer, FloatingActions) |
| `app/layout.tsx` | remover Header, Footer e FloatingActions |
| `app/links/page.tsx` + `page.test.tsx` | criar |
| `lib/site.ts`, `components/ui/icons.tsx` | alterar |
| `app/sitemap.test.ts` | criar (garante `/links` fora do sitemap) |

## 4. Estratégia de testes
| Critério | Teste | Tamanho |
|---|---|---|
| CA1.1 | mostra logo, nome e frase | pequeno |
| CA1.2 | três botões na ordem certa | pequeno |
| CA1.3 a CA1.5 | destino de cada botão | pequeno |
| CA1.6 | ícones sociais com nome acessível e destino | pequeno |
| CA1.7 | `target="_blank"` e `rel="noopener"` nos externos | pequeno |
| SEO | `robots` noindex/follow e canonical `/links`; sitemap sem `/links` | pequeno |
