# Site público: indexação e URLs antigas

## O que existe

- **Domínio oficial:** `https://www.bahiafalcao.com.br`. O domínio sem `www` e o `http` redirecionam para ele com 308 (`frontend/next.config.ts` e Vercel).
- **Domínio antigo** `falcaodistribuidora.com`: o `next.config.ts` já tem o redirecionamento para o domínio oficial, mas ele só funciona quando o DNS desse domínio apontar para a Vercel (veja "Pendente").
- **URLs do site antigo em Joomla** (`frontend/src/proxy.ts`): antes do site atual, o domínio hospedava um Joomla com milhares de perfis de spam do componente K2, como `/?option=com_k2&view=itemlist&task=user&id=123`. Essas URLs agora respondem **410 Gone**, com `X-Robots-Tag: noindex`.

## Como funciona

O `proxy.ts` (o antigo "middleware" do Next.js, renomeado na versão 16) tem um `matcher` que só roda em dois casos:

- a raiz com o parâmetro `option` (Joomla sem URL amigável);
- `/component/...` (Joomla com URL amigável).

A página inicial, inclusive com parâmetros de campanha como `?utm_source=`, e as outras páginas não passam pelo proxy. Os testes ficam em `frontend/src/proxy.test.ts`.

## Por quê

Sem o proxy, essas URLs abriam a página inicial com status 200. O Google as tratava como centenas de cópias da home e as listava no Search Console em "Cópia sem página canônica", "Rastreada, mas não indexada" e "Página com redirecionamento". O **410** diz que a página foi removida de vez. Com ele, o Google para de rastreá-las e as tira do índice mais rápido que com um 404.

## Pendente

- **falcaodistribuidora.com** ainda aponta para a Hostinger, que roda um WordPress com erro: qualquer URL, inclusive o `robots.txt`, responde 500. Quando houver acesso ao domínio:
  1. adicionar `falcaodistribuidora.com` e `www.falcaodistribuidora.com` ao projeto na Vercel;
  2. trocar o DNS para a Vercel, sem mexer nos registros MX se houver e-mail no domínio;
  3. usar a ferramenta "Mudança de endereço" do Search Console.
