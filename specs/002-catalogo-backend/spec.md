# Spec 002: Backend do catálogo de produtos

- **Status:** Aprovada (2026-11-10)
- **Criada em:** 2026-11-10
- **Pedido original:** "crie as especificações, lembre-se o catálogo do pdf é a referência principal de informações. inicialmente vamos fazer o backend, em typescript, node, prisma, postgres." · "foque também no seo destes produtos"

> Esta spec descreve **O QUÊ** e **POR QUÊ**. A stack pedida (TypeScript, Node, Prisma, PostgreSQL) é decisão já tomada pelo usuário e entra no **plano**, não aqui.

## 1. Contexto e objetivo

A Falcão tem hoje o catálogo em um **PDF de 641 páginas** (Catálogo 10.2026, arquivo `CATALOGO BAHIA FALCAO 03 11 2026.pdf`), enviado por WhatsApp. Ele não aparece no Google, não tem busca e é difícil de atualizar. O PDF já foi lido e convertido em dados: cerca de **5.336 cards**, **9.211 códigos internos**, referências, aplicações, marcas, logos e fotos.

O objetivo desta etapa é ter a **base de dados e o serviço do catálogo**, que vão:

1. guardar o catálogo com **fidelidade ao PDF**, que é a **referência principal** das informações;
2. entregar ao site público tudo o que ele precisa para mostrar, buscar e filtrar produtos, **sem expor dados internos**;
3. entregar ao site tudo o que o **Google** precisa para indexar cada produto e cada categoria. Assim, quem pesquisar o nome de uma peça, uma referência original ou "peça + Feira de Santana" encontra a Falcão;
4. servir de **base para o futuro cadastro**, quando a equipe passará a manter o catálogo por um painel, e o PDF será **substituído** por este sistema.

**Resultado de negócio esperado:** mais contatos qualificados pelo WhatsApp, vindos de busca orgânica no Google, e autonomia da equipe para manter o catálogo.

## 2. Usuários afetados

- **Cliente final** (mecânico, frotista, dono de caminhão ou carreta, borracharia, autopeças), de forma indireta, pelo site público.
- **Buscadores** (Google, Bing) e **assistentes de IA**, que leem as páginas de produto.
- **Equipe da Falcão** (comercial e cadastro), que atende pelo WhatsApp e, no futuro, mantém o catálogo.

## 3. Conceitos (glossário)

- **Produto:** um **card do PDF**. Itens que aparecem juntos no mesmo card são **um** produto; cards separados no PDF são produtos separados.
- **Variação:** cada item vendável dentro de um produto (por exemplo, as 23 medidas do Anel Elástico Externo). Cada variação tem um **código interno**.
- **Código interno:** o código em vermelho no PDF. É de **uso exclusivo da equipe** e **nunca** aparece ao público.
- **Referência:** código de terceiros que identifica a peça: original da montadora, similar ou do fabricante (os que vêm rotulados "Ref.", "Original", "Cód. original", "Similar" no PDF). É **público**.
- **Aplicação:** onde a peça serve: montadora, modelo, ano, posição (dianteira/traseira, eixo) e lado (direito/esquerdo).
- **Especificação:** dado técnico em forma de atributo e valor (rosca M16, haste 250 mm, 24 V, material).
- **Marca:** fabricante da peça (Eckisil, IABV, Master…), montadora (Mercedes-Benz, Volvo…) ou implemento (Randon, Guerra…), com sua logo.
- **Categoria:** as categorias do sumário do PDF (41) mais Lançamentos, organizadas em **grupos**.

## 4. Histórias de usuário

### H1: Importar o catálogo do PDF com fidelidade
Como **equipe da Falcão**, quero carregar no sistema os dados extraídos do PDF, para que o catálogo digital tenha exatamente as mesmas informações do impresso.

- **CA1.1:** Dado o conjunto extraído do PDF, quando a importação termina, então a quantidade de produtos e de códigos internos no sistema é igual à do conjunto importado. Cada produto guarda a página do PDF de onde veio.
- **CA1.2:** Dado um card com várias variações no PDF, quando importado, então vira **um** produto com essas variações, cada uma com seu código interno e sua descrição.
- **CA1.3:** Dado um card que traz referências, aplicações, especificações, marcas, logos e foto, quando importado, então cada informação fica guardada no seu lugar próprio (referência, aplicação, especificação, marca, imagem).
- **CA1.4:** Dado um trecho do card que não pôde ser classificado em nenhum campo, quando a importação termina, então ele fica guardado como **pendência** ligada ao produto, e nenhuma informação do PDF é descartada.
- **CA1.5:** Dado que a importação já foi feita, quando ela roda de novo com os mesmos dados, então nada é duplicado e o resultado é o mesmo (importação repetível).
- **CA1.6:** Dado que a importação termina, então ela gera um **relatório** com: produtos importados, variações, referências, produtos sem foto, produtos com nome a revisar e pendências não classificadas.
- **CA1.7:** Dado que a carga inicial foi feita e a equipe passou a editar pelo cadastro, então a importação do PDF **não é usada de novo** como atualização. Daí em diante, o cadastro é a fonte (decisão E2).
- **CA1.8:** Dado o catálogo importado, então ele preserva a **ordem do PDF** (ordem das categorias e dos produtos dentro de cada categoria), para permitir no futuro **gerar um catálogo em PDF** a partir do sistema.

### H2: Listar e filtrar produtos (site público)
Como **cliente**, quero ver os produtos por grupo e categoria e filtrar, para achar a peça do meu veículo.

- **CA2.1:** Dado o catálogo publicado, quando peço a lista de produtos, então recebo uma página de resultados com o total, a página atual e os produtos. Cada produto traz o endereço público, nome, foto, categoria, grupo, marcas/logos, a referência principal (se houver), o número de variações e o selo "Novo" (se for lançamento).
- **CA2.2:** Dado um filtro por grupo, categoria, marca, montadora, "com referência" ou "novidades", quando aplicado, então só aparecem produtos que atendem a todos os filtros escolhidos.
- **CA2.3:** Dado qualquer filtro ativo, quando peço as opções de filtro, então cada opção traz a quantidade de produtos que sobraria ao escolhê-la.
- **CA2.4:** Dado um produto que não está publicado (rascunho ou inativo), então ele nunca aparece nas listas públicas.

### H3: Buscar produtos (site público)
Como **cliente**, quero buscar pelo nome, por uma referência ou por uma marca, para achar a peça mesmo sem saber a categoria.

- **CA3.1:** Dado o termo "catraca scania", quando busco, então recebo produtos cujo nome, marca, aplicação ou categoria contêm essas palavras, sem diferenciar maiúsculas e acentos.
- **CA3.2:** Dado uma referência digitada com ou sem pontos, traços e espaços (por exemplo "945 420 03 38" ou "9454200338"), quando busco, então encontro o produto que tem essa referência.
- **CA3.3:** Dado um termo abreviado como no PDF (por exemplo "ARR ALUM", "PF SX"), quando busco, então encontro os produtos correspondentes.
- **CA3.4:** Dado um **código interno** digitado na busca pública, quando busco, então **nenhum** resultado é encontrado por esse código (ele não é pesquisável publicamente).
- **CA3.6:** Dado um cliente que procura peças SILC, quando busca "SILC" ou filtra pela marca SILC, então encontra todos os produtos com referência SILC. Quando busca "SC-03.158" ou "SC03158", encontra o produto dessa referência, que aparece como "SILC SC-03.158".
- **CA3.5:** Dado um termo sem resultados, quando busco, então recebo lista vazia e sugestões de termos ou categorias próximas.

### H4: Ver o detalhe de um produto (site público)
Como **cliente**, quero ver todas as informações de um produto, para confirmar que é a peça certa antes de chamar no WhatsApp.

- **CA4.1:** Dado o endereço público de um produto, quando o abro, então recebo nome legível, nome como no catálogo, categoria e grupo, fotos, marcas/logos, variações (descrição e referências de cada uma), aplicações (montadora, modelo, ano, posição, lado), especificações técnicas, observações, embalagem e selo "Novo", quando houver.
- **CA4.2:** Dado qualquer resposta pública, então ela **nunca** contém código interno, valor do imposto, status de revisão, página do PDF, texto original do PDF nem pendências.
- **CA4.5:** Dado a variação "ANEL ELAST EXTERNO 10 IMP (6,5)", quando a vejo no site, então ela aparece como importada, com nome sem "IMP (6,5)", e o valor 6,5 não aparece em lugar nenhum.
- **CA4.3:** Dado um produto, quando o abro, então recebo os dados para a mensagem do WhatsApp: **nome** do produto e, se escolhida, a **variação** e a **referência** dela. Nunca o código interno.
- **CA4.4:** Dado um endereço de produto inexistente ou despublicado, quando o abro, então recebo "não encontrado". Se o produto foi apenas renomeado, recebo o novo endereço para redirecionamento permanente (ver H6).

### H5: Equipe identificar o produto pedido no WhatsApp (uso interno)
Como **equipe comercial**, quero achar o código interno a partir do nome ou da referência que o cliente mandou, para atender rápido.

- **CA5.1:** Dado o nome de um produto (como aparece no site) ou uma referência, quando a equipe consulta, então recebe o produto com os códigos internos de cada variação.
- **CA5.2:** Dado alguém sem autorização, quando tenta essa consulta, então o acesso é negado e nenhum código interno é revelado.

### H6: Ser encontrado no Google (SEO dos produtos)
Como **Falcão**, quero que cada produto e cada categoria tenha uma página que o Google entenda e indexe, para receber clientes pela busca orgânica.

- **CA6.1 (endereço):** Dado qualquer produto publicado, então ele tem um endereço **único, estável e legível** em português, que inclui o nome do produto (e não o código interno). O mesmo vale para cada categoria e cada grupo.
- **CA6.2 (título e descrição):** Dado qualquer produto ou categoria, então há um **título** e uma **descrição** próprios e **únicos**. O título inclui o nome da peça e, quando houver, a marca ou a montadora principal. A descrição cita as principais referências e aplicações, a "linha pesada" e "Feira de Santana – BA". Os textos ficam dentro dos limites de tamanho recomendados para aparecer inteiros no Google.
- **CA6.3 (referências pesquisáveis):** Dado um produto com referências, então elas aparecem como **texto** na página (não só em imagem), para que a busca pelo código original encontre a Falcão.
- **CA6.4 (dados estruturados):** Dado um produto, então há dados para descrevê-lo como **produto** para os buscadores: nome, imagem, descrição, marca, categoria e referências (código de fabricante), além da **trilha de navegação** (Catálogo › Grupo › Categoria › Produto). Nunca o código interno. Preço e disponibilidade não são informados, porque não há venda online e a consulta é feita pelo WhatsApp.
- **CA6.5 (imagens):** Dado um produto com foto, então cada imagem tem um texto alternativo descritivo, gerado a partir do nome e da marca, e um nome de arquivo legível.
- **CA6.6 (sitemap):** Dado o catálogo publicado, então existe a lista completa de endereços de produtos, categorias e grupos publicados, com a data da última alteração de cada um, pronta para o sitemap.
- **CA6.7 (conteúdo duplicado):** Dado que o PDF repete o mesmo item em mais de um card (1.229 cards com código repetido), quando importado, então ele vira **um único produto, com uma única página**, listado em **todas as categorias** em que aparece no PDF (decisão E1).
- **CA6.8 (mudança de endereço):** Dado um produto cujo nome muda, quando o endereço muda, então o endereço antigo continua válido e leva ao novo com **redirecionamento permanente**. Endereços publicados nunca "quebram".
- **CA6.9 (páginas de categoria):** Dado uma categoria ou grupo, então há um texto curto de apresentação (o que a categoria inclui e para quais veículos), além da lista de produtos, para que a página não seja só uma grade.
- **CA6.10 (qualidade mínima):** Dado um produto com informação insuficiente (por exemplo, sem nome confirmado), então ele fica **fora do índice do Google** até ser revisado, sem deixar de existir no catálogo.
- **CA6.11 (produtos relacionados):** Dado um produto, então há uma lista de produtos relacionados (mesma categoria e mesma aplicação), para ligar as páginas entre si.

### H7: Base para o futuro cadastro
Como **equipe de cadastro**, quero que o modelo de dados já permita criar, editar, publicar e desativar produtos, para substituir o PDF sem refazer a base.

- **CA7.1:** Dado um produto, então ele tem situação (rascunho, publicado, inativo), data de criação, data de última alteração e origem (importado do PDF ou criado no cadastro).
- **CA7.2:** Dado qualquer categoria nova (fora das 41), quando cadastrada, então os produtos dela ganham as mesmas capacidades de busca, filtro e SEO, sem mudança na estrutura.
- **CA7.3:** Dado especificações de produtos de categorias diferentes (parafuso, cuíca, lâmpada), então todas cabem na mesma estrutura de atributo e valor, e cada categoria pode ter uma lista de atributos sugeridos.

## 5. Regras de negócio

- **R1, o PDF é a referência principal:** em caso de divergência entre fontes, vale o PDF, até a equipe alterar pelo cadastro. O nome como está no catálogo é sempre guardado.
- **R2, sigilo dos dados internos:** o código interno, o **valor do imposto** e os dados de controle da importação **nunca** saem em respostas públicas, nem em dados para buscadores.
- **R3, nome legível:** cada produto e variação tem um nome legível (abreviações do PDF por extenso, como "ARR" → "Arruela", "PF SX" → "Parafuso sextavado", "LD/LE" → "lado direito/esquerdo"). O site exibe o nome por extenso, e o nome do catálogo continua guardado e pesquisável (decisão E6).
- **R4, categorias:** as categorias são as do sumário do PDF (pág. 2) mais Lançamentos. Na importação, a página do PDF define a categoria, pelo título impresso ou, sem título, pela posição no sumário.
- **R7, referência ligada a uma marca:** toda referência guarda **de qual marca ela é** (montadora como Mercedes-Benz e Volvo, ou fabricante como SILC, Master e Fras-le) e o **tipo** (original, similar, equivalente). Essas marcas entram no filtro de marcas, e a busca acha o produto pela marca ou pelo código dela.
- **R6, importados e imposto:** quando o nome no PDF traz "IMP (x,xx)", a variação fica marcada como **importada** (informação pública) e o valor entre parênteses é guardado como **valor do imposto** (informação interna). "IMP (x,xx)" sai do nome exibido ao público.
- **R5, lançamentos:** produtos das páginas "LANÇAMENTO" recebem o selo "Novo" **e** ficam na sua categoria de peça, e aparecem no filtro "Novidades" (decisão E4).

## 6. Requisitos não funcionais

- **SEO:** ver H6. Termos-alvo: nome da peça + "linha pesada", nome + montadora/modelo, referência original, "autopeças linha pesada Feira de Santana", "peças para caminhão Feira de Santana", "peças para carreta Bahia".
- **Desempenho:** lista e busca respondem em menos de **300 ms** (p95) com o catálogo completo (cerca de 5.300 produtos e 9.200 variações); detalhe do produto em menos de **150 ms** (p95). As páginas devem permitir atingir as metas de Core Web Vitals da constituição (LCP < 2,5 s).
- **Disponibilidade das páginas:** o site precisa poder gerar as páginas de produto antecipadamente e atualizá-las quando o produto mudar, para ficarem rápidas e indexáveis.
- **Segurança:** a consulta interna (H5) e a importação (H1) exigem autorização. Respostas públicas passam por filtro que remove dados internos (R2). Toda entrada é validada. Limite de requisições na busca pública.
- **LGPD:** o catálogo não contém dados pessoais. A consulta interna registra quem consultou, sem guardar dados de clientes.
- **Acessibilidade:** os dados entregues permitem texto alternativo em toda imagem (CA6.5).

## 7. Fora do escopo (nesta spec)

- **O site institucional atual não muda.** Ele só ganha a aba **"Catálogo"** no menu, e isso entra na spec do frontend do catálogo.
- **Telas** do site público (grade, filtros, modal, página de produto): spec separada do frontend do catálogo.
- **Gerar o catálogo em PDF** a partir do sistema: desejo futuro. Aqui só se garante que os dados permitem isso (CA1.8).
- **Painel de cadastro** (telas de criar e editar): spec futura. Aqui só o modelo de dados e as regras que o suportam (H7).
- Preço, estoque, carrinho e compra online.
- Integração com ERP ou sistema de estoque.
- Melhorar as fotos (as do PDF têm 80 a 250 px). O modelo aceita várias fotos por produto para substituição futura.
- Revisão manual dos nomes marcados "a revisar" (cerca de 1.950 produtos): é trabalho de conteúdo, apoiado pelo relatório do CA1.6.

## 8. Decisões (esclarecimentos respondidos em 2026-11-10)

- ~~E1: Repetidos~~ **Decidido:** um produto só, com uma página, listado em todas as categorias em que aparece no PDF.
- ~~E2: Reimportação~~ **Decidido:** a importação é só a carga inicial. No futuro, o sistema pode **gerar** um PDF (fora do escopo; ver CA1.8).
- ~~E3: Valor entre parênteses~~ **Decidido:** em "ANEL ELAST EXTERNO 10 **IMP (6,5)**", **IMP** indica que o item é **importado** e **(6,5)** é o **valor do imposto**. Ver R6.
- ~~E4: Lançamentos~~ **Decidido:** ficam na **categoria da peça**, com selo "Novo" e filtro "Novidades" (R5).
- ~~E5: "REF SILC"~~ **Decidido:** SILC é uma **marca**, e "SC-03.158" é a **referência SILC** da peça. É **pública**, e há clientes que só compram se for SILC. Ver R7 e CA3.6.
  - *"Sugestão Rei"* não é código. É uma **recomendação técnica** impressa nos cards de coxins (págs. impressas 273 a 288): "Sugestão Rei: Substituir os dois coxins (lado direito e lado esquerdo)…". Ela vai para **Observações**, que são públicas.
- ~~E6: Nome exibido~~ **Decidido:** o site mostra o nome **por extenso** ("Arruela de alumínio 14 × 20 mm"). O abreviado do PDF continua guardado e pesquisável (R3).

- ~~E7: Grupos de categoria~~ **Decidido:** cerca de 10 grupos (Freios, Suspensão, Rodas e cubos, Ar e pneumática, Direção e filtros, Carreta e implementos, Cabine e elétrica, Fixação, Oficina, Linha leve e importados) como **divisão inicial**. Os grupos são **dados editáveis** (cadastro), não fixos. O cadastro definitivo dos grupos, feito a partir dos produtos do catálogo, será pedido depois.
- ~~E8: ID público~~ **Decidido:** **sem número público**. A mensagem do WhatsApp leva só o **nome** do produto, a **variação** escolhida e a **referência** (CA4.3).

## 9. Checklist de qualidade da spec
- [x] Nenhum `[PRECISA ESCLARECER]` aberto
- [x] Todo critério de aceite é testável e observável
- [x] Nenhuma decisão técnica (como) na spec
- [x] Escopo e "fora do escopo" claros
- [x] Aprovada pelo responsável (2026-11-10)

> Pendente para o plano: incluir ou não o **link da página do produto** na mensagem do WhatsApp (sugestão feita na aprovação, ainda sem resposta).
