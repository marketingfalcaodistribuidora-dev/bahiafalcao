# Spec 004: Orçamentos (lista de cotação) no painel

- **Status:** Aprovada (2026-11-11)
- **Criada em:** 2026-11-11
- **Pedido original:** "Quero criar uma parte onde poderá fazer um orçamento." · "O preço não estará no catálogo, é só uma busca pra uma possível cotação, não teremos nada de cliente agora, a cotação é feita por quem usa o sistema. Não teremos nada dessas condições por enquanto. O acompanhamento deve ter os filtros, as coisas incompletas devem ser só o rascunho."

> Esta spec descreve **O QUÊ** e **POR QUÊ**. Depende do painel ([spec 003](../003-painel-administrador/spec.md)) e do catálogo ([spec 002](../002-catalogo-backend/spec.md)).

## 1. Contexto e objetivo

Quando chega um pedido de cotação (pelo WhatsApp, no balcão ou por telefone), a equipe precisa reunir os produtos pedidos, conferir códigos e onde estão guardados e, depois, fazer a cotação. Hoje isso é anotado à mão.

O **orçamento** no painel é uma **lista de produtos do catálogo** montada por quem usa o sistema, com quantidades, que fica salva para consulta e acompanhamento. O **valor de cada item é digitado no próprio orçamento** (o catálogo não tem preço) e o sistema calcula o total de cada item e o total final. **Não tem cliente nem condições comerciais.**

**Resultado esperado:** montar a lista em poucos cliques, sem erro de código, e encontrar depois qualquer orçamento pelos filtros.

## 2. Usuários afetados

- **Equipe do painel** (atendimento, balcão, vendas): cria e consulta orçamentos.
- **Administrador:** vê os orçamentos de todos e define quem pode criar (permissões da spec 003).

## 3. Histórias de usuário

### H1: Montar um orçamento
Como **usuário do painel**, quero juntar numa lista os produtos de uma cotação, para não anotar à mão nem errar código.

- **CA1.1:** Dado que crio um orçamento, então dou a ele uma **identificação livre** (ex.: "Pedido do WhatsApp, caminhão Scania 124") e ele recebe um **número** único (ex.: "Orçamento 0123").
- **CA1.2:** Dado um orçamento aberto, então adiciono produtos pela **mesma busca da consulta rápida** (nome, referência ou código interno), escolho a **variação** e a **quantidade**.
- **CA1.3:** Dado um item na lista, então vejo foto, nome, variação, referência, **código interno** e **onde está guardado** (conforme as permissões do perfil), e posso mudar a quantidade, escrever uma **observação** curta ou remover o item.
- **CA1.7:** Dado um item na lista, então digito o **valor unitário** (em reais) e o sistema mostra o **total do item** (valor × quantidade) e o **total do orçamento**, atualizados na hora.
- **CA1.4:** Dado que adiciono um produto que já está na lista com a mesma variação, então a quantidade é somada, sem criar linha repetida.
- **CA1.5:** Dado que estou montando o orçamento, então tudo é **salvo sozinho** enquanto edito. Não há botão de salvar.
- **CA1.6:** Dado um orçamento sem itens ou ainda em montagem, então ele fica como **rascunho**.

### H2: Concluir o orçamento
Como **usuário do painel**, quero marcar o orçamento como concluído, para separar o que está pronto do que ainda é rascunho.

- **CA2.1:** Dado um orçamento com pelo menos um item e **todos os itens com valor**, quando o concluo, então ele passa de **rascunho** para **concluído**.
- **CA2.2:** Dado um orçamento sem itens ou com item sem valor, quando tento concluí-lo, então sou avisado do que falta.
- **CA2.3:** Dado um orçamento concluído, então posso clicar em **Editar**, e ele volta a ser rascunho até ser concluído de novo.

### H3: Usar a lista
Como **usuário do painel**, quero levar a lista para onde vou fazer a cotação, para não redigitar.

- **CA3.1:** Dado um orçamento, então posso **copiar a lista em texto** (número, identificação, uma linha por item com quantidade, nome, variação, referência, valor unitário e total do item, e o total final), pronta para colar no WhatsApp ou em outro sistema. 
- **CA3.2:** Dado a cópia do texto, então posso escolher **incluir ou não** os códigos internos e a localização.

### H4: Acompanhar os orçamentos
Como **usuário do painel**, quero encontrar qualquer orçamento depois, para retomar ou consultar.

- **CA4.1:** Dado a lista de orçamentos, então vejo número, identificação, data, quantidade de itens, **valor total**, quem criou e a situação (**rascunho** ou **concluído**).
- **CA4.2:** Dado os **filtros**, então posso filtrar por situação, período (hoje, últimos 7 dias, últimos 30 dias, intervalo de datas) e quem criou, e buscar por número, identificação ou produto contido.
- **CA4.3:** Dado o início do painel, então vejo quantos **rascunhos** meus estão abertos, com acesso direto a eles.
- **CA4.4:** Dado qualquer orçamento (rascunho ou concluído), então posso **excluí-lo** pela lista ou pela tela do orçamento, depois de confirmar numa janela que mostra número, identificação e total. A exclusão não pode ser desfeita.

## 4. Regras de negócio

- **R1, situações:** só existem **rascunho** (incompleto, em montagem) e **concluído**.
- **R2, valor digitado, sem cliente:** o valor de cada item é digitado no orçamento e fica gravado nele (o catálogo não tem preço). O orçamento não guarda cliente nem condições comerciais; isso pode vir no futuro, em outra spec.
- **R6, valores em reais:** valores com duas casas decimais; total do item = valor unitário × quantidade; total do orçamento = soma dos totais dos itens.
- **R3, dados internos respeitam o perfil:** código interno e localização aparecem no orçamento só para quem tem essas permissões (spec 003, H12).
- **R4, permissões:** "criar orçamentos" e "ver orçamentos de todos" são permissões dos perfis. Sem a segunda, a pessoa vê só os próprios.
- **R5, produto alterado ou desativado:** se um produto da lista for desativado depois, o orçamento continua mostrando o item, com o aviso "produto desativado".

## 5. Requisitos não funcionais

- **Rapidez:** adicionar um item em até 3 ações (buscar, escolher, confirmar), usando só o teclado se quiser.
- **Celular:** montar e consultar orçamentos também pelo celular.
- **LGPD:** sem dados de clientes. Guarda só quem criou e quando.
- **SEO:** nada público; o painel não é indexado.
- **Design:** segue o protótipo do painel (spec 003).

## 6. Fora do escopo (por enquanto)

- Preço no catálogo (o valor existe só no orçamento), desconto, frete, validade, prazo e forma de pagamento.
- Cadastro de clientes e dados do cliente no orçamento.
- PDF do orçamento e envio ao cliente pelo sistema.
- Situações de venda (aprovado, perdido) e transformação em pedido.

## 7. Decisões (2026-11-11)

- **Q1:** concluído pode ser **editado** (botão "Editar", volta a rascunho). Qualquer orçamento pode ser **excluído**, com confirmação (ajustado a pedido do responsável).
- **Q2:** "Copiar lista" mantido, com valores e total, e opção de incluir ou não código interno e localização.
- **Valores:** digitados no orçamento, com total por item e total final.

## 8. Checklist de qualidade da spec
- [x] Nenhum `[PRECISA ESCLARECER]` aberto
- [x] Todo critério de aceite é testável e observável
- [x] Nenhuma decisão técnica (como) na spec
- [x] Escopo e "fora do escopo" claros
- [x] Aprovada pelo responsável (2026-11-11)
