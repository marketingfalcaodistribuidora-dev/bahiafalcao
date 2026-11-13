# Medição do Google (tag e consentimento de cookies)

## O que é

O site público carrega a **tag do Google** (contêiner do Tag Manager `GTM-MTSNF479`), para medir as visitas e preparar anúncios. Pela LGPD, cookies de medição e de anúncios não são essenciais: a pessoa precisa **aceitar**. Por isso:

- a tag carrega com o **consentimento negado** (Modo de Consentimento v2 do Google): sem aceite, o Google não grava cookies de medição nem de anúncios;
- um **aviso de cookies** pergunta, com **Aceitar** e **Recusar** do mesmo tamanho (recusar precisa ser tão fácil quanto aceitar);
- a escolha vale por **12 meses**; depois, o aviso volta;
- o rodapé tem **Preferências de cookies**, que reabre o aviso para mudar a escolha.

## Como funciona

| Peça | Onde | O que faz |
|---|---|---|
| Regras | `frontend/src/lib/consentimento.ts` | Lê e grava a escolha no navegador (`localStorage`, chave `falcao-consentimento`), monta os sinais do Google e decide se a tag carrega |
| Script inicial | `scriptInicialDaTag()`, no `layout.tsx` com `strategy="beforeInteractive"` | Antes de tudo: cria o `dataLayer` e o `gtag`, define tudo como **negado** e, se a pessoa já aceitou (e não venceu), reaplica o aceite |
| Tag | `layout.tsx`, `next/script` com `strategy="afterInteractive"` | Carrega `gtm.js` depois que a página fica interativa (não atrasa o carregamento) |
| Aviso | `frontend/src/components/layout/AvisoDeCookies.tsx` | Mostra o aviso enquanto não houver escolha; ao escolher, grava e envia `gtag('consent','update', …)` |
| Rodapé | `Footer.tsx` | Botão "Preferências de cookies" |

- **Onde carrega:** só no **site oficial em produção**. Prévias da Vercel (não indexáveis) e `npm run dev` não carregam nada, para as visitas da equipe não entrarem na medição.
- **O identificador** fica em `site.googleTagId` (`frontend/src/lib/site.ts`). Ele é público (aparece no HTML) e é conferido por formato antes de ir para a URL do script.
- **Navegador que bloqueia o armazenamento:** a escolha vale só naquela visita, e nada quebra.
- **Ordem conferida num navegador de verdade** (13/11/2026): quando o `gtm.js` roda, o `dataLayer` já começa com `consent default` negado.

## Por quê

- **Consentimento negado por padrão:** é o que a LGPD e as orientações da ANPD pedem para cookies não essenciais. O Modo de Consentimento ainda deixa o Google estimar as visitas de quem recusa, sem cookies.
- **Tag depois da interação:** a tag não atrasa o carregamento, o que preserva o Core Web Vitals e o SEO.
- **Escolha guardada no navegador:** não há cadastro nem dado pessoal no servidor.

## Pendências

- **Política de privacidade:** o site ainda não tem uma página explicando os dados coletados (cookies do Google e WhatsApp). É recomendada pela LGPD. Ela entra como página nova (`/nova-pagina`, com revisão de SEO), e o aviso de cookies passa a ter o link "Saiba mais".
- **No Tag Manager:** as tags do contêiner devem respeitar o consentimento (configuração "Verificações de consentimento" de cada tag, no painel do Google).
