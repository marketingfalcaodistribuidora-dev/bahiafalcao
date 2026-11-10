# Spec 001: Página de links para o Instagram

- **Status:** Aprovada (esclarecimentos respondidos em 2026-11-10)
- **Criada em:** 2026-11-10
- **Pedido original:** "vamos criar uma página de links para colocar no instagram, a gente tem atualmente o linktr.ee/falcaodistribuidora.br mas vamos criar esse nosso personalizado, com as mesmas informações e com o site atual"

## 1. Contexto e objetivo
A bio do Instagram aponta hoje para o Linktree, que leva ao site antigo (`falcaodistribuidora.com`, fora do ar). Queremos uma página de links **própria**, com a identidade da marca, no domínio oficial. Assim o tráfego do Instagram fortalece o domínio `bahiafalcao.com.br` e leva ao site novo e ao WhatsApp.

## 2. Usuários afetados
Seguidores do Instagram (e do TikTok) que tocam no link da bio, quase sempre no **celular**.

## 3. Histórias de usuário
**H1:** Como seguidor no Instagram, quero ver numa única tela os canais da empresa, para escolher como falar com ela ou conhecê-la.

- **CA1.1:** Dado que abro a página, então vejo a logo, o nome "Bahia Falcão Distribuidora" e a frase "Autopeças e ferramentas · Linha pesada".
- **CA1.2:** Dado que abro a página, então vejo, nesta ordem, os botões: **Fale conosco pelo WhatsApp**, **Visite nosso site**, **Nossa localização**.
- **CA1.3:** Quando toco em "Fale conosco pelo WhatsApp", então abre uma conversa com (75) 3622-8260, já com mensagem pronta.
- **CA1.4:** Quando toco em "Visite nosso site", então vou para a página inicial do site oficial.
- **CA1.5:** Quando toco em "Nossa localização", então abre o Perfil da Empresa no Google Maps. O botão mostra o endereço abaixo do título, como no Linktree.
- **CA1.6:** Dado que abro a página, então vejo ícones para Instagram, TikTok, WhatsApp e Telefone, cada um com nome acessível.
- **CA1.7:** Links externos abrem em nova aba e com segurança.

## 4. Requisitos não funcionais
- **Visual:** mesma identidade do site (preto e dourado), pensada primeiro para celular.
- **Desempenho:** página leve e estática, que abre rápido no 4G.
- **SEO:** a página **não é indexada** pelo Google e não entra no sitemap, mas os links dela são seguidos.
- **Acessibilidade:** botões grandes (≥ 48 px), contraste AA e navegação por teclado.
- **LGPD:** a página não coleta dados.

## 5. Fora do escopo
- Rastreamento de cliques e analytics.
- Editar os links por painel (por enquanto, mudança via código).
- Desativar o Linktree: isso é feito pelo usuário depois de trocar o link na bio.

## 6. Decisões (esclarecimentos respondidos)
- **Endereço:** `www.bahiafalcao.com.br/links`.
- **Telefone:** os dois. O botão principal de WhatsApp usa o (75) 3622-8260 e o ícone de telefone liga para o 0800 703 8260.
- **Indexação:** não indexar.

## 7. Checklist de qualidade da spec
- [x] Nenhum `[PRECISA ESCLARECER]` aberto
- [x] Todo critério de aceite é testável e observável
- [x] Nenhuma decisão técnica (como) na spec
- [x] Escopo e "fora do escopo" claros
- [x] Aprovada pelo responsável
