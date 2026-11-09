---
name: pre-deploy
description: Checklist de publicação do site. Valida qualidade, SEO, segurança e dados reais da empresa antes de colocar o site no ar. Use quando o usuário falar em publicar, subir, fazer deploy ou colocar no ar.
disable-model-invocation: true
---

# Checklist de publicação

Execute cada bloco e marque ✅, ⚠️ ou ❌. Não publique nada por conta própria: o deploy é do usuário.

## 1. Qualidade
- [ ] `/verificar` passou por completo (formatação, lint, tipos, build).

## 2. Dados reais (`frontend/src/lib/site.ts`)
- [ ] WhatsApp preenchido (somente dígitos, com 55 e DDD) e testado: o link abre a conversa certa.
- [ ] Telefone, Instagram e horário preenchidos ou conscientemente vazios.
- [ ] Ano de fundação e quantidade de itens confirmados pela empresa.
- [ ] Endereço idêntico ao Perfil da Empresa no Google.

## 3. Ambiente
- [ ] Hospedagem: **Vercel**, projeto com *Root Directory* = `frontend`.
- [ ] `NEXT_PUBLIC_SITE_URL` definido na Vercel (ambiente Production) com o domínio próprio (https, sem barra no final). Sem ele, o site usa o domínio `*.vercel.app` de produção (ver `frontend/src/lib/env.ts`).
- [ ] Previews da Vercel saem com `noindex` e `robots.txt` bloqueado (automático via `NEXT_PUBLIC_VERCEL_ENV`).
- [ ] `GOOGLE_SITE_VERIFICATION` definido, se for usar o Search Console por meta tag.
- [ ] Nenhum segredo em `NEXT_PUBLIC_*`.

## 4. SEO
- [ ] Rode `/auditoria-seo` e não deixe nenhum item de prioridade **Alta** aberto.
- [ ] `/robots.txt` e `/sitemap.xml` apontam para o domínio real.
- [ ] Prévia de compartilhamento ok (teste o link no WhatsApp ou em https://www.opengraph.xyz).

## 5. Segurança
- [ ] Peça ao agente **security-auditor** a auditoria, sem achados Críticos ou Altos abertos.
- [ ] HTTPS ativo e redirecionamento de `http` e de `www`/sem `www` para a URL canônica.

## 6. Depois de publicar (orientar o usuário)
- [ ] Cadastrar o domínio no Google Search Console e enviar o sitemap.
- [ ] Atualizar o site no Perfil da Empresa no Google.
- [ ] Rodar o PageSpeed Insights (celular) e registrar LCP, INP e CLS.

Entregue o checklist preenchido e a lista do que falta.
