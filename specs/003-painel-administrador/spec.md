# Spec 003: Painel do administrador do catálogo

- **Status:** Aprovada (2026-11-11)
- **Criada em:** 2026-11-11
- **Pedido original:** "vamos deixar o backend para depois porque preciso ver o meu acesso ao hostinger. vamos planejar o front do administrador."

> Esta spec descreve **O QUÊ** e **POR QUÊ**. Não cite tecnologia, arquivos ou código: isso é do plano.
> Depende do modelo de dados da [spec 002](../002-catalogo-backend/spec.md) (produto, variação, código interno, referência, aplicação, especificação, marca, categoria, grupo).

## 1. Contexto e objetivo

O catálogo em PDF (641 páginas) será **substituído** pelo sistema. Para isso, a equipe da Falcão precisa de um **painel** para:

1. **completar** os produtos que ainda têm informação faltando (nome a confirmar, informação sem campo definido, sem foto, sem categoria). A carga inicial do catálogo vem do PDF atual, mas **o painel não faz nenhuma referência ao PDF**: para a equipe, todo produto é como se tivesse sido cadastrado do zero (R8). A conferência contra o PDF é feita antes da carga, fora do painel;
2. **cadastrar e manter todo o catálogo** no dia a dia (criar, editar, publicar e desativar produtos, organizar seções e ordem) sem depender de programador. O painel passa a ser a **fonte do catálogo**, do site e, no futuro, de um **PDF navegável** gerado pelo sistema;
3. **atender pelo WhatsApp** com rapidez, achando o código interno a partir do nome ou da referência que o cliente mandou;
4. **cuidar do que aparece no site e no Google** (categorias, marcas, banners, textos de SEO).
5. servir como **sistema interno da equipe**, além do site: localização física dos produtos (H15) e orçamentos com valores ([spec 004](../004-orcamentos/spec.md)). Nem tudo o que está no painel vai para o site.

**Resultado esperado:** catálogo sempre atualizado e correto, equipe autônoma e o PDF aposentado.

## 2. Usuários afetados

Pessoas da equipe da Falcão, cada uma com um **perfil de acesso**. Os perfis **não são fixos**: o administrador cria tipos de perfil e define o que cada um pode fazer (decisão P1, ver H12). Exemplos de perfis que podem ser criados:
- **Administrador:** acesso total, incluindo usuários, perfis e configurações (existe sempre);
- **Cadastro:** mantém produtos, categorias e marcas e completa os produtos com informação faltando;
- **Comercial:** só consulta (achar produto e código interno para atender no WhatsApp).

## 3. Histórias de usuário

### H1: Entrar no painel com segurança
Como **usuário da equipe**, quero entrar com meu acesso pessoal, para que só a equipe veja e altere dados internos.

- **CA1.1:** Dado que não estou autenticado, quando abro qualquer tela do painel, então sou levado à tela de entrada.
- **CA1.2:** Dado credenciais válidas, quando entro, então vejo o painel conforme o meu perfil. Credenciais inválidas mostram uma mensagem genérica, sem dizer qual parte está errada.
- **CA1.3:** Dado várias tentativas erradas seguidas, então novas tentativas ficam bloqueadas por um tempo.
- **CA1.4:** Dado que fico inativo por um período, então a sessão expira e preciso entrar de novo.
- **CA1.5:** Dado um perfil sem uma permissão (por exemplo, sem "editar produtos"), então não vejo os botões e telas correspondentes. Tentar acessá-los diretamente mostra "sem permissão", e o servidor também recusa a ação.
- **CA1.6:** O painel **nunca** aparece no Google: não é indexado e não entra no sitemap.

- **CA1.7:** Dado um usuário cadastrado, então ele entra com **e-mail e senha** (decisão P2). A senha tem tamanho mínimo e nunca é exibida nem guardada em texto legível.
- **CA1.8:** Dado que esqueci a senha, então o administrador consegue redefini-la para mim. [Recuperação automática por e-mail fica para a etapa de reforço do login.]

### H2: Ver a situação do catálogo (início)
Como **administrador ou cadastro**, quero ver um resumo ao entrar, para saber o que precisa de atenção.

- **CA2.1:** Dado o catálogo, quando abro o início, então vejo contagens (cada quadro abre a lista de produtos já filtrada) de: produtos publicados, rascunhos, inativos, **a revisar**, pendências, sem foto e sem referência, cada uma levando à lista filtrada correspondente.
- **CA2.2:** Dado alterações recentes, então vejo as últimas alterações (quem, o quê, quando).

### H3: Encontrar produtos
Como **usuário da equipe**, quero buscar e filtrar produtos, para chegar rápido ao que preciso.

- **CA3.1:** Dado a lista de produtos, quando busco por nome (por extenso ou abreviado), referência **ou código interno**, então encontro o produto. No painel, o código interno é pesquisável.
- **CA3.2:** Dado os filtros (grupo, categoria, marca, montadora, situação, a revisar, com pendência, sem foto, sem referência, novo), quando combino filtros, então a lista mostra só o que atende a todos, com a quantidade total.
- **CA3.3:** Dado a lista, então cada linha mostra foto, nome, códigos internos, categoria principal, situação e alertas (nome a confirmar, informação sem campo, sem foto).
- **CA3.4:** Dado uma busca ou filtro, quando volto da edição de um produto, então a lista mantém a busca, os filtros e a página em que eu estava.

### H4: Cadastrar e editar produtos
Como **cadastro**, quero criar e editar produtos com todas as informações, para manter o catálogo completo.

- **CA4.1:** Dado um produto, quando o edito, então posso alterar: nome por extenso, **categorias** (adicionar e remover quantas quiser, com uma **principal**; **Importados** é uma dessas categorias), marcas e logos, fotos (enviar, ordenar, remover, texto alternativo), observações, embalagem, selo "Novo" e situação.
- **CA4.2:** Dado as **variações** do produto, então posso adicionar, editar, reordenar e remover variações, cada uma com descrição, **código interno** (obrigatório e **único** no catálogo) e, quando o produto está na categoria Importados, **valor do imposto** (dado interno).
- **CA4.3:** Dado uma variação, então posso cadastrar **referências** com marca (ex.: SILC, Mercedes-Benz), tipo (original, similar, equivalente, fabricante) e código. Se a referência for igual a algum código interno do catálogo, o painel **avisa e impede** salvar.
- **CA4.4:** Dado um produto, então escrevo a **aplicação** (onde a peça serve) e as **especificações técnicas** em **texto livre com formatação simples**: negrito (com o botão **B**, Ctrl+B ou `**texto**`), listas e subtítulos, com **pré-visualização** de como fica no site. As **montadoras** são marcadas à parte, para o filtro do site. As observações usam o mesmo editor.
- **CA4.11:** Dado um produto com **informação sem campo definido** (trecho da carga inicial que não foi classificado), quando abro a ficha, então vejo esse trecho no topo e escolho se ele vira referência, aplicação, especificação ou observação, ou se não é necessário.
- **CA4.10:** Dado um produto, então a situação dele diz, em texto claro, se ele **já aparece nas buscas do Google** ou **o que falta** para aparecer (ex.: "Ainda não aparece no Google: falta foto ou referência. Ele entra sozinho quando estiver completo."). Esse aviso aparece só na ficha do produto, não nas listas.
- **CA4.5:** Dado que tento salvar com dado obrigatório faltando ou inválido, então vejo o erro junto do campo e nada é salvo.
- **CA4.6:** Dado alterações não salvas, quando tento sair da tela, então sou avisado.
- **CA4.7:** Dado um produto novo, quando o crio, então ele nasce como **rascunho** e não aparece no site até ser publicado.
- **CA4.9:** Dado que duas pessoas editam o mesmo produto ao mesmo tempo, quando a segunda salva, então é avisada de que o produto mudou e não sobrescreve sem confirmar.

### H5: Publicar, despublicar e desativar
Como **cadastro**, quero controlar o que aparece no site, para não publicar produto incompleto.

- **CA5.1:** Dado um rascunho, quando publico, então ele passa a aparecer no site.
- **CA5.2:** Dado um produto publicado, quando o desativo, então ele sai do site, o endereço antigo passa a responder "removido" e o produto continua no painel para consulta.
- **CA5.3:** Dado um produto, quando tento publicar sem os dados mínimos (nome, categoria principal, ao menos uma variação com código interno), então a publicação é bloqueada, com a lista do que falta.
- **CA5.4:** Dado vários produtos selecionados na lista, então posso publicar, desativar ou mudar a categoria de todos de uma vez, com confirmação. *(Etapa 2)*

### H6: (retirada)
A tela própria "Para completar" foi retirada a pedido do responsável (2026-11-11). Produtos incompletos são achados pelos **filtros da lista de produtos** (H3) e pelos **quadros do início** (H2), e as informações sem campo definido são resolvidas **na ficha do produto** (CA4.11).

### H7: Organizar categorias e grupos
Como **administrador**, quero organizar categorias e grupos, para que a navegação do site faça sentido.

- **CA7.1:** Dado as categorias e grupos, então posso criar, renomear, reordenar (setas ↑ ↓), mover categorias entre grupos e definir o texto de apresentação, numa lista única com busca.
- **CA7.2:** Dado uma categoria com produtos, quando tento excluí-la, então sou impedido até mover os produtos.
- **CA7.3:** Dado uma categoria, então posso definir um **modelo de especificações** (ex.: Parafusos → "- **Diâmetro:** / - **Comprimento:** / - **Rosca:**"), que já vem preenchido ao cadastrar um produto dessa categoria.
- **CA7.4:** Dado que renomeio uma categoria ou grupo, então o endereço antigo continua levando ao novo no site.

### H8: Gerenciar marcas e logos
Como **cadastro**, quero manter as marcas com suas logos, para que apareçam certas nos produtos e nos filtros.

- **CA8.1:** Dado as marcas, então posso criar e editar marcas e definir o tipo (fabricante, montadora, implemento) e a logo.

### H9: Cuidar do SEO de cada produto e categoria
Como **administrador**, quero ver e ajustar como o produto aparece no Google, para atrair mais clientes.

- **CA9.1:** Dado um produto ou categoria, então vejo uma **prévia** de como aparece no Google (título, endereço e descrição), com o contador de caracteres e um alerta quando passar do limite.
- **CA9.2:** Dado o título e a descrição gerados automaticamente, então posso substituí-los por um texto próprio ou voltar ao automático.
- **CA9.3:** Dado um produto, então vejo se ele está **no índice do Google ou fora**, e por quê (ex.: "nome a revisar", "sem foto nem referência", "título repetido"), com o que falta para entrar.
- **CA9.4:** Dado que altero o endereço (slug) de um produto, então o antigo passa a redirecionar para o novo, e sou avisado disso antes de salvar.

### H10: Consulta rápida para o atendimento
Como **comercial**, quero digitar o que o cliente mandou no WhatsApp e achar o produto e o código interno, para atender rápido.

- **CA10.1:** Dado um nome, parte de nome ou referência, quando busco na consulta rápida, então vejo os produtos com foto, nome, variações, **códigos internos** e referências, e posso copiar o código com um clique.
- **CA10.2:** Dado o link de um produto do site (se o cliente mandar), quando o colo na consulta, então vejo o produto correspondente.
- **CA10.3:** A consulta funciona bem no **celular**.

### H11: Configurar o catálogo do site
Como **administrador**, quero ajustar o que aparece no catálogo do site sem programador.

- **CA11.1:** Dado as configurações, então posso definir o **modelo da mensagem do WhatsApp** dos produtos. O número continua vindo dos dados da empresa e não é editado aqui.
- **CA11.2:** Dado os **banners** do catálogo, então posso criar, ordenar e definir imagem (computador e celular), textos, botões e período de exibição (início e fim). *(Etapa 2)*
- **CA11.3:** Dado produtos em destaque, então posso escolher quais aparecem como destaque e em que ordem. *(Etapa 2)*

### H12: Usuários, perfis e permissões
Como **administrador**, quero criar tipos de perfil com as permissões que eu escolher e atribuí-los às pessoas, para controlar o que cada uma pode ver e fazer.

- **CA12.1:** Dado a lista de usuários, então posso criar usuários (nome, e-mail e senha inicial), alterar o perfil, bloquear e reativar.
- **CA12.4:** Dado a tela de perfis, então posso **criar, renomear e excluir** perfis, marcando as permissões de cada um numa lista. A lista inclui, separadamente:
  - ver produtos; criar e editar produtos; publicar, despublicar e desativar;
  - **ver código interno**; **ver valor do imposto** (sensíveis, desmarcadas por padrão em perfil novo);
  - ver localização; editar localização (H15);
  - categorias e grupos; marcas; SEO; organização do catálogo (H14);
  - consulta rápida; configurações do catálogo; histórico de alterações; usuários e perfis.
- **CA12.5:** Dado que altero as permissões de um perfil, então a mudança vale **na hora** para todas as pessoas com esse perfil.
- **CA12.6:** Dado o perfil **Administrador**, então ele sempre tem todas as permissões e não pode ser excluído. O sistema impede remover o último usuário administrador ativo, para ninguém ficar trancado fora.
- **CA12.7:** Dado um perfil atribuído a alguém, quando tento excluí-lo, então sou impedido até mover essas pessoas para outro perfil.
- **CA12.8:** Dado a primeira instalação, então já existem os perfis **Administrador**, **Cadastro** e **Comercial** como ponto de partida, todos editáveis (exceto as regras do CA12.6).
- **CA12.9:** Dado um perfil sem "ver código interno", então em nenhuma tela (incluindo a consulta rápida e o histórico) o código interno aparece para essa pessoa. O mesmo vale para o valor do imposto.
- **CA12.2:** Dado um usuário bloqueado, então ele perde o acesso imediatamente.
- **CA12.3:** Dado as chaves de acesso de sistemas (consulta interna), então posso criar, ver o último uso e revogar.

### H13: Histórico de alterações
Como **administrador**, quero saber quem mudou o quê, para corrigir erros e ter controle.

- **CA13.1:** Dado um produto, então vejo o histórico de alterações (quem, quando e o que mudou, antes e depois).
- **CA13.2:** Dado uma alteração errada, então posso restaurar a versão anterior de um produto. *(Etapa 2)*

### H14: Organizar o catálogo para o PDF futuro
Como **cadastro**, quero organizar a ordem e as seções do catálogo no painel, para que, no futuro, o sistema gere um **PDF navegável** sem eu ter que montar nada à mão.

- **CA14.1:** Dado os grupos, categorias e produtos, então posso definir a **ordem** de cada um (arrastando), e essa ordem vale para o site e para o PDF futuro.
- **CA14.2:** Dado um produto, então posso marcar se ele **entra no catálogo em PDF** (por padrão, todo produto publicado entra).
- **CA14.3:** Dado o catálogo importado, então a ordem inicial é a **mesma do PDF atual** (spec 002, CA1.8), para o primeiro PDF gerado sair na organização que a equipe já conhece.
- **CA14.4:** Dado um produto que está em mais de uma categoria, então posso escolher **em quais seções** ele aparece no PDF.

### H15: Localização física do produto (onde está guardado)
Como **equipe de balcão e atendimento**, quero ver onde cada item está guardado, para ir direto buscar sem procurar pelo depósito.

- **CA15.1:** Dado um produto, então posso escrever onde ele fica (uma localização para o produto inteiro, decisão L1), em **texto livre**, do jeito que a equipe fala (ex.: "Corredor 3, prateleira B2, gaveta de cima" ou "Depósito, fundo à esquerda").
- **CA15.2:** Dado uma busca na **consulta rápida**, então cada produto encontrado mostra, em destaque, onde está guardado, junto dos códigos internos.
- **CA15.3:** Dado a lista de produtos, então posso filtrar os itens **sem localização** e buscar pelo texto da localização (ex.: "corredor 3" mostra o que está guardado ali, útil para inventário e reorganização).
- **CA15.4:** Dado que mudo um item de lugar, então a nova localização vale na hora e fica no histórico (quem mudou, de onde, para onde).
- **CA15.5:** A localização é **dado interno**: aparece só no painel, para perfis com "ver localização", e nunca vai para o site. Alterar exige "editar localização".
## 4. Regras de negócio

- **R1, dados internos ficam no painel:** código interno, valor do imposto e **localização física** aparecem **só** no painel, para perfis com essas permissões (CA12.9), e nunca vão para o site (regra R2 da spec 002).
- **R2, código interno único:** não podem existir duas variações com o mesmo código interno.
- **R3, publicação mínima:** só é publicado produto com nome, categoria principal e ao menos uma variação com código interno (CA5.3).
- **R4, endereços não quebram:** toda mudança de endereço de produto, categoria ou grupo gera redirecionamento (spec 002, CA6.8).
- **R9, texto livre com formatação:** aplicação, especificações e observações são texto livre com formatação simples (negrito, listas, subtítulos) e pré-visualização. A localização (H15) é texto simples.
- **R6, sem nome abreviado no painel:** o painel mostra e edita só o nome por extenso. O nome abreviado da carga inicial fica guardado por trás, apenas para a busca (spec 002, R3).
- **R7, importado é categoria:** não existe caixa "importado"; o produto importado está na categoria **Importados** (spec 002, R6).
- **R8, sem referência ao PDF original:** quem usa o painel não vê nada sobre o PDF de origem (imagem do card, número de página, "importação do PDF"). Todo produto aparece como cadastrado do zero (decisão do responsável, 2026-11-11). O catálogo em PDF **futuro**, gerado pelo sistema (H14), é outra coisa e continua previsto.
- **R5, nada se perde:** excluir produto não é permitido. Ele é **desativado** e continua no painel.

## 5. Requisitos não funcionais

- **Design (decisão P3):** referência aprovada em [`docs/design/03-painel-administrador/Painel.html`](../../docs/design/03-painel-administrador/Painel.html) (2026-11-11). A prioridade é a **experiência de uso: fácil, intuitivo e com visual agradável**, na identidade da marca (preto, grafite e dourado), mais claro e confortável para uso prolongado. Critérios de experiência:
  - **Aprender sem treinamento:** rótulos em português simples, sem jargão técnico; ajuda curta junto dos campos menos óbvios.
  - **Poucos cliques:** tarefas frequentes (achar produto, corrigir nome, publicar, copiar código interno) em no máximo 3 cliques a partir do início; busca sempre à mão.
  - **Padrões consistentes:** listas, formulários, botões e mensagens se comportam igual em todas as telas.
  - **Retorno claro:** toda ação mostra o resultado (salvo, publicado, erro e como resolver); ações destrutivas pedem confirmação e, quando possível, permitem desfazer.
  - **Agradável:** espaços generosos, hierarquia visual clara, fotos dos produtos em destaque e estados vazios com orientação do que fazer.
  - A proposta de telas será validada com o responsável **antes** da implementação, e os ajustes entram no design de referência.
- **Dispositivos:** cadastro e revisão pensados para **computador**; consulta rápida (H10) também no **celular**.
- **Desempenho:** listas e busca do painel respondem em menos de 1 s com o catálogo completo; salvar um produto, em menos de 1 s.
- **Acessibilidade:** teclado, foco visível, contraste AA e rótulos em todos os campos (constituição, Art. VIII).
- **Segurança:** todo acesso autenticado e por perfil, verificação de permissão no servidor (não só esconder botão), sessão com expiração, proteção contra tentativas repetidas, registro de alterações (H13).
- **LGPD:** o painel guarda dados pessoais dos **usuários da equipe** (nome e e-mail), só para acesso e histórico. Não guarda dados de clientes.
- **SEO:** o painel não é indexado (CA1.6).

## 6. Fora do escopo

- O **backend** (spec 002): o painel usa os dados e as regras de lá. Enquanto o backend não existir, a tela pode ser construída com dados de exemplo.
- **Gerar o catálogo em PDF** a partir do painel: será uma spec própria, quando o layout for definido. Já se sabe que será um **PDF navegável e organizado**, com sumário clicável, seções por grupo e categoria e links entre as partes. Nesta spec, o painel só guarda a organização que esse PDF vai usar (H14).
- **Definição final dos grupos de categoria** a partir dos produtos: será pedida depois (o painel só oferece a ferramenta, H7).
- **Reforço do login** (verificação em duas etapas, recuperação de senha por e-mail, conta Google): etapa futura (decisão P2).
- **Duplicar produto**, **juntar marcas repetidas**, **duplicar perfil** e a **tela "Para completar"**: retirados a pedido do responsável (2026-11-11).
- Preço, estoque, pedidos e integração com ERP.
- Edição dos dados da empresa (endereço, telefone, horário): continuam fixos no site.

## 7. Decisões (esclarecimentos respondidos em 2026-11-11)

- ~~P1: Perfis~~ **Decidido:** perfis **editáveis**, nada fixo. O administrador cria tipos de perfil, define as permissões de cada um e os atribui às pessoas (H12). Administrador, Cadastro e Comercial vêm prontos como ponto de partida.
- ~~P2: Forma de entrada~~ **Decidido:** por enquanto, **só e-mail e senha**, sem verificação em duas etapas, para o responsável poder testar. Verificação em duas etapas, recuperação de senha por e-mail e outras medidas entram depois, numa etapa própria de **reforço do login**. ⚠️ Recomendação registrada: fazer esse reforço **antes** de dar acesso à equipe com os dados reais, porque o painel mostra códigos internos e imposto.
- ~~P3: Design~~ **Decidido:** eu proponho as telas e o responsável aprova. Prioridade: experiência fácil, intuitiva e visual agradável (critérios na seção 5).
- ~~P4: Escopo~~ **Decidido:** **essencial primeiro** (ver "Etapas" abaixo).
- ~~P5: Endereço~~ **Decidido:** endereço separado, **`admin.bahiafalcao.com.br`**.

- ~~L1~~ **Decidido:** **uma localização para o produto inteiro** (não por variação).
- ~~L2 e L3~~ **Decidido:** a localização é **texto livre** (decisão do responsável). Vários locais, depósitos ou mais de um lugar para o mesmo item são escritos no próprio texto (ex.: "Loja: corredor 3, prat. B2 · Depósito: fundo").

### Etapas

**Etapa 1 (esta entrega):**
- H1 Entrada (e-mail e senha);
- H2 Início;
- H3 Encontrar produtos;
- H4 Cadastrar e editar produtos;
- H5 Publicar, despublicar e desativar, **sem** a ação em lote (CA5.4);
- H7 Categorias e grupos;
- H8 Marcas e logos;
- H10 Consulta rápida;
- H15 Localização física (texto livre, uma por produto);
- H12 Usuários, perfis e permissões;
- H13 Histórico de alterações, **só** a consulta (CA13.1), que também alimenta o início (CA2.2).

**Etapa 2:**
- H9 SEO no painel (prévia do Google, motivo de estar fora do índice, edição de endereço);
- H11 Configurações (mensagem do WhatsApp, banners, destaques);
- CA5.4 Ações em lote;
- CA13.2 Restaurar versão anterior;
- H14 Organização para o PDF futuro (marcar se entra no PDF, seções). A ordem inicial já vem da carga inicial (spec 002, CA1.8).

**Etapa futura:** reforço do login (P2) e geração do PDF navegável (spec própria).

Enquanto a etapa 1 não tiver o SEO no painel, títulos, descrições e endereços seguem as regras automáticas da spec 002.

## 8. Checklist de qualidade da spec
- [x] Nenhum `[PRECISA ESCLARECER]` aberto
- [x] Todo critério de aceite é testável e observável
- [x] Nenhuma decisão técnica (como) na spec
- [x] Escopo e "fora do escopo" claros
- [x] Aprovada pelo responsável (2026-11-11)
