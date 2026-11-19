# Catálogo Falcão – Especificação para desenvolvimento

Nov 19, 2026 · @Someone

## Visão geral

O catálogo é uma nova seção do site bahiafalcao.com.br em que o cliente busca peças, monta uma lista e envia o pedido de cotação pelo WhatsApp. Não há preço, estoque, carrinho nem pagamento nesta versão.

- **Design (fonte da verdade visual):** [canvas no Claude Design](https://claude.ai/artifact/WoLa2hTTJcvpmxojRsTv2X) — 18 pranchas: catálogo, administração, acesso, usuários, configurações, folha de componentes e pranchas de estados.
- **Site atual:** [bahiafalcao.com.br](https://bahiafalcao.com.br/) — topo, rodapé, cores e fontes devem ser os mesmos.
- **WhatsApp de destino:** +55 75 3622-8260 (`wa.me/557536228260`).

**Escopo**

| Área | Telas | Público |
| --- | --- | --- |
| Catálogo | Lista com busca e filtros, detalhe da peça, lista de cotação | Clientes, sem login |
| Administração | Login, primeiro acesso, recuperar senha, produtos, novo/editar produto, importar planilha, categorias, usuários, configurações, minha conta | Equipe Falcão, com login |

**Fora do escopo desta versão:** preço, estoque, conta de cliente, checkout, integração com ERP.

**Glossário**

| Termo | Significado |
| --- | --- |
| Código | Código interno da Falcão, exibido no selo amarelo "cód.0103". Único. Tratar sempre como texto (zeros à esquerda importam). |
| Código original | Código da montadora ou do fabricante original. |
| Similares | Códigos equivalentes de outros fabricantes. Vários por produto. |
| Aplicação | Texto curto de onde a peça serve (ex.: "Carretas guerra"). |
| Aplicação por veículo | Tabela opcional montadora · veículo · detalhe · ano, mostrada no detalhe da peça. |
| Segmento | Lista fixa: Linha pesada, Carretas, Ferramentas. |
| Categoria | Lista editável na administração (Freios, Molas, Suspensão…). |
| Cotação | Lista de peças montada pelo cliente e enviada como mensagem de WhatsApp. |

## Revisão técnica do design

O design cobre os fluxos principais, mas encontrei 14 pontos que o desenvolvimento precisa saber antes de começar. Os estados que não estão desenhados estão especificados em texto nas seções 5, 6 e 7 e devem seguir os componentes da folha "Componentes e estados".

| # | Ponto | Onde | Prioridade | Como resolver |
| --- | --- | --- | --- | --- |
| 1 | A tabela "Aplicação por veículo" aparece no detalhe da peça, mas não existe no formulário da administração nem na planilha | Detalhe da peça, Editar produto, Importar | Alta | Resolvido no design: bloco "Aplicação por veículo" adicionado em Editar produto. Na planilha, uma aba separada "aplicacoes" (seção 9). |
| 2 | A cotação está desenhada como tela separada | Minha cotação | Alta | Desktop: gaveta lateral à direita (440 px) sobre o catálogo. Celular: tela cheia. Mesmo conteúdo do design. |
| 3 | Estados não desenhados: peça inexistente/oculta, foto quebrada, busca curta, conta bloqueada, redefinir senha, link expirado, erro de upload, importação em andamento, arquivo inválido, categoria em uso | Várias | Alta | Especificados nas matrizes de estado (seções 5 e 7). |
| 4 | Faltavam categorias, gestão de usuários, primeiro acesso, Minha conta e Configurações | Administração | Média | Resolvido: tela Categorias desenhada (seção 7). |
| 5 | Menu do celular aberto e "Ordenar" no celular não desenhados | Celular | Média | Menu: gaveta da esquerda com links do site, WhatsApp e telefone. Ordenar: painel inferior (bottom sheet) com 3 opções. |
| 6 | Paginação: o catálogo usa "Mostrar mais" e a administração usa páginas | Catálogo | Média | Manter os dois. No catálogo, "Mostrar mais" carrega +24 e atualiza `?pagina=` na URL para SEO e botão voltar. |
| 7 | Estilos estão escritos direto em cada elemento no design | Todas | Média | Extrair para variáveis CSS (seção 3). Não copiar o HTML do design para produção. |
| 8 | Cinza #8A8D92 em texto pequeno tem contraste 3,4:1 (abaixo do mínimo 4,5:1) | Importar (célula "vazio"), paginação | Média | Usar #5F6266 para qualquer texto legível. #8A8D92 só em itens desativados. |
| 9 | Barra "Minha cotação" do celular aparece mesmo vazia | Celular | Baixa | Mostrar só com 1 item ou mais; entrar com animação de baixo para cima. |
| 10 | Contagem de itens no topo usa número de peças distintas; a gaveta mostra quantidades | Catálogo | Baixa | Contador = número de peças distintas (não a soma das quantidades). |
| 11 | Logo do topo é provisória | Todas | Alta (antes de publicar) | Usar `falcao-distribuidora-logo-horizontal.png` e o símbolo SVG do site atual. |
| 12 | Fotos são espaços reservados | Catálogo, detalhe | Alta (antes de publicar) | Estado "Foto em breve" vale para produção enquanto não houver foto. |
| 13 | Dados de exemplo (códigos 0101–0112, Ranger etc.) | Todas | — | Não usar como seed de produção. |
| 14 | Regras de segurança do login (bloqueio, validade do link, sessão) são sugestões do design | Login | Média | Confirmar na seção 11 antes de implementar. |

## Design tokens

Toda cor, fonte e medida deve vir destas variáveis; nenhum valor solto no CSS.

**Cores**

| Variável | Valor | Uso |
| --- | --- | --- |
| `--amarelo` | #F7BF00 | Ação principal, selo do código, contador |
| `--amarelo-hover` | #E3AE00 | Botão principal ao passar o mouse |
| `--amarelo-claro` | #FFF1BF | Filtro ativo, anel de foco dos campos |
| `--preto` | #0B0B0C | Topo, rodapé, títulos, texto sobre amarelo |
| `--texto` | #16171A | Texto padrão |
| `--texto-2` | #5F6266 | Texto secundário, legendas |
| `--desativado` | #8A8D92 | Somente itens desativados |
| `--fundo` | #F5F4F1 | Faixas, fundo das fotos, fundo da administração |
| `--borda` | #DCD9D1 | Cards, divisórias |
| `--borda-campo` | #C9C6BE | Campos de formulário |
| `--verde` | #17834A | WhatsApp, sucesso (texto branco) |
| `--verde-claro` / `--verde-escuro` | #E8F5EC / #14663A | Botão "Na cotação", avisos de sucesso |
| `--vermelho` | #B3261E | Erro, excluir |
| `--vermelho-claro` / `--vermelho-escuro` | #FDECEA / #7A1A14 | Avisos de erro |
| `--aviso-claro` / `--aviso-escuro` | #FFF8E0 / #4D3F00 | Dicas |

**Tipografia** (Google Fonts: Barlow 400/500/600 e Barlow Condensed 600/700/800, `display=swap`)

| Estilo | Fonte | Tamanho / altura | Peso | Observação |
| --- | --- | --- | --- | --- |
| Título de página | Barlow Condensed | 48 / 1.0 (celular 36) | 700 | Maiúsculas |
| Título de seção | Barlow Condensed | 30 / 1.0 | 700 | Maiúsculas |
| Título de card/modal | Barlow Condensed | 22–28 / 1.05 | 700 | Maiúsculas |
| Selo do código | Barlow Condensed itálico | 15 / 19 / 40 | 800 | P / M / G |
| Botão grande | Barlow Condensed | 18–20 | 700 | Maiúsculas, espaçamento 0,08em |
| Texto de apoio | Barlow | 17 / 1.5 | 400 |  |
| Nome da peça | Barlow | 16 / 1.3 | 600 | Nunca em maiúsculas |
| Texto padrão | Barlow | 15 / 1.5 | 400–600 |  |
| Legenda | Barlow | 13 / 1.4 | 400–500 |  |

**Medidas**

| Token | Valores |
| --- | --- |
| Espaçamento | 4, 8, 12, 16, 20, 24, 32, 48 px |
| Raio | 3 px selo · 8 px botões pequenos · 10 px botões e campos · 14 px cards · 16 px modais · 999 px pílulas |
| Sombra de card | `0 1px 2px rgba(0,0,0,.05), 0 12px 26px -16px rgba(0,0,0,.3)` |
| Sombra de card (hover) | `0 2px 4px rgba(0,0,0,.06), 0 22px 36px -18px rgba(0,0,0,.4)` + `translateY(-4px)` + borda amarela |
| Foco (teclado) | `outline: 2px solid #0B0B0C; outline-offset: 2px; box-shadow: 0 0 0 5px #F7BF00` |
| Alvo de toque mínimo | 44 × 44 px |
| Alturas | Campo 48–50 · botão 44 (card) / 48 / 52 (principal) · busca 52–56 |
| Container | Máx. 1200 px, margem lateral 24 px (celular 16 px) |
| Grade de cards | `repeat(auto-fill, minmax(200px, 1fr))`, gap 24 px; celular 2 colunas, gap 12 px |
| Transições | 150–200 ms ease; desligar com `prefers-reduced-motion` |

**Pontos de quebra**

| Largura | Comportamento |
| --- | --- |
| ≥ 1024 px | Filtros na lateral (220 px), menu completo no topo |
| 641–1023 px | Filtros viram fileira de chips acima da grade; menu vira botão |
| ≤ 640 px | Layout do celular: 2 colunas, barra fixa "Minha cotação", cotação em tela cheia |

## Componentes e estados

Cada componente abaixo precisa existir com todos os estados listados; os desenhados estão na folha "Componentes e estados" do canvas. Todos têm estado de foco por teclado (token "Foco").

| Componente | Variantes | Estados obrigatórios | Regras |
| --- | --- | --- | --- |
| Botão | Principal (amarelo), Secundário (contorno), WhatsApp (verde), Perigo (vermelho), Link, Só ícone | Normal, hover, foco, pressionado, carregando (spinner + texto "Salvando…"), desativado | `<button>` para ações, `<a>` para navegação. Carregando bloqueia clique duplo. Só ícone exige `aria-label`. Um botão principal por bloco. |
| Botão "Adicionar à cotação" | Card, detalhe | Fora da lista (amarelo "+ Adicionar à cotação"), na lista (verde "✓ Na cotação"), foco | Alterna: clicar na lista remove. `aria-pressed`. Cada adição dispara o aviso "Adicionado à cotação" com link "Ver lista (n)". |
| Campo de texto | Texto, e-mail, senha (com mostrar/esconder), área de texto | Vazio, foco, preenchido, erro (borda vermelha + mensagem abaixo), desativado, somente leitura | `<label>` visível sempre. Erro com `aria-invalid` e `aria-describedby`. Validar ao sair do campo e ao salvar, nunca a cada tecla. |
| Lista (select) | — | Igual ao campo | Nativo `<select>`. |
| Busca | Topo do catálogo, administração | Vazia, digitando, com texto (botão × limpar), buscando (spinner no lugar da lupa), sem resultado | `type="search"`. Busca enquanto digita após 300 ms; Enter busca na hora. |
| Chave liga/desliga | Lista de produtos, editar produto | Ligada (verde), desligada (cinza), salvando, desativada | `<button role="switch" aria-checked>`. Salva na hora, sem botão salvar. Se falhar, volta ao estado anterior e mostra aviso de erro. |
| Caixa de seleção | — | Marcada, desmarcada, foco, desativada | Nativa, `accent-color: #0B0B0C`. |
| Selo do código | P (15 px), M (19 px), G (40 px) | — | Texto sempre "cód." + código. Inclinação com `skewX(-12deg)` no fundo e `skewX(12deg)` no texto. |
| Filtro lateral | Segmento, Categoria | Normal, hover, ativo (amarelo claro, negrito), sem itens (contagem 0, desativado) | Mostra contagem. Trocar segmento zera a categoria. |
| Filtro aplicado (chip) | — | Normal, foco | Clique remove o filtro. Ao lado, link "Limpar filtros". Só aparece com filtro ativo. |
| Card de produto | Catálogo (grade), relacionadas | Padrão, hover, foco, na cotação (borda verde), sem foto ("Foto em breve"), foto com erro (igual a sem foto), carregando (esqueleto) | Nome e foto levam ao detalhe. Nome em até 3 linhas, depois reticências. Botão sempre alinhado na base. |
| Esqueleto (carregando) | Card, linha de tabela, texto | Animação de brilho | Sem brilho com `prefers-reduced-motion`. `aria-busy="true"` no container. |
| Item da cotação | — | Normal, quantidade mínima (− desativado em 1), quantidade máxima (+ desativado em 999), removendo | "Remover" tira na hora e mostra aviso com "Desfazer" por 5 s. |
| Aviso flutuante (toast) | Sucesso, erro, informação | Entrando, visível, saindo | Canto inferior (celular: acima da barra fixa). Some em 5 s; erro só some ao fechar. `role="status"` (erro: `role="alert"`). Máx. 3 empilhados. |
| Aviso fixo (banner) | Erro, dica | — | Dentro da página, não some sozinho. |
| Janela de confirmação (modal) | Excluir, sair sem salvar, sessão expirada | Aberta, ação em andamento | `role="alertdialog"`, foco preso dentro, Esc fecha (menos sessão expirada), foco volta ao botão que abriu. Clicar fora não fecha modais destrutivos. |
| Gaveta (drawer) | Cotação (direita), menu do celular (esquerda) | Fechada, abrindo, aberta | Mesmas regras de foco do modal. Fundo escurecido clicável fecha. Rolagem da página travada. |
| Painel inferior (bottom sheet) | Ordenar no celular | Fechado, aberto | Opções como botões de rádio; aplicar ao tocar. |
| Estado vazio | Busca sem resultado, cotação vazia, lista vazia, filtro sem resultado | — | Ícone em círculo + título + explicação + 1 ação principal. Nunca só "Nenhum resultado". |
| Paginação | Administração | Página atual (amarelo), outras, anterior/próxima desativadas nas pontas | 25 por página. `aria-current="page"`. |
| "Mostrar mais" | Catálogo | Normal, carregando, oculto no fim | Mostra "Mostrando 24 de 312" acima do botão. Foco vai para o primeiro card novo. |
| Envio de foto | Editar produto | Vazio, arrastando por cima (borda amarela), enviando (barra de progresso), com foto (prévia + Trocar + Remover), erro | Aceita JPG, PNG, WebP até 5 MB. |

## Telas públicas do catálogo

O catálogo tem 3 rotas públicas e todo filtro vive na URL, para que links compartilhados e o botão voltar funcionem.

| Rota | Tela | Parâmetros |
| --- | --- | --- |
| `/catalogo` | Lista com busca e filtros | `q`, `segmento`, `categoria`, `ordem` (`relevancia`, `codigo`, `nome`), `pagina` |
| `/catalogo/{codigo}-{slug-do-nome}` | Detalhe da peça | — (código antigo ou slug errado redireciona 301 para o certo) |
| Gaveta "Minha cotação" | Sobre qualquer tela do catálogo | `#cotacao` abre a gaveta |

**Regras da busca**

1. Procura em: código, código original, similares, nome, aplicação, aplicação por veículo, categoria.
2. Ignora acentos, maiúsculas, espaços, pontos e hífens em códigos ("hfcm-2313" acha "HFCM 2313").
3. Todas as palavras precisam aparecer (E), em qualquer campo.
4. Ordem por relevância: código exato → original/similar exato → começo do nome → resto.
5. Mínimo 2 caracteres; com 1, não busca e mostra a dica "Digite pelo menos 2 letras".
6. Busca ao digitar após 300 ms; Enter busca na hora; resultados em 24 por vez.

**Matriz de estados – Catálogo (lista)**

| Estado | Quando | O que mostra | No design |
| --- | --- | --- | --- |
| Carregando | Primeira carga ou nova busca/filtro | Esqueleto de 6 cards; filtros visíveis | Sim |
| Padrão | Resultados | Contagem "312 peças encontradas", grade, "Mostrar mais" | Sim |
| Com filtros | Segmento, categoria ou busca ativos | Chips dos filtros + "Limpar filtros" | Sim |
| Busca curta | 1 caractere | Dica abaixo da busca; grade anterior continua | Não – texto acima |
| Sem resultado (busca) | 0 resultados com `q` | Estado vazio com o termo, convite ao WhatsApp com o termo na mensagem, sugestões | Sim |
| Sem resultado (só filtro) | 0 resultados sem `q` | "Nenhuma peça nesta combinação" + "Limpar filtros" | Não – usar componente Estado vazio |
| Carregando mais | Clique em "Mostrar mais" | Spinner no botão; cards atuais ficam | Não – usar Botão carregando |
| Fim da lista | Todos carregados | Esconde "Mostrar mais"; mostra "Você viu todas as 312 peças" | Não |
| Erro | Falha de rede/servidor | Banner de erro com "Tentar de novo" e WhatsApp | Sim |
| Peça na cotação | Item já na lista | Card com borda verde e botão "✓ Na cotação" | Sim |

**Matriz de estados – Detalhe da peça**

| Estado | Quando | O que mostra |
| --- | --- | --- |
| Carregando | Navegação | Esqueleto da foto e da ficha |
| Padrão | Peça visível | Foto, selo, nome, botões, especificações, aplicação, relacionadas |
| Sem foto | Sem imagem ou imagem quebrada | "Foto em breve" com o falcão cinza |
| Várias fotos | Mais de 1 imagem | Miniaturas clicáveis abaixo; setas no celular (fora do escopo se só 1 foto por produto) |
| Sem especificações / sem aplicação por veículo / sem relacionadas | Dados vazios | O bloco inteiro some (nunca tabela vazia) |
| Peça inexistente ou oculta | Código não existe ou `visivel = false` | Página 404 com título "Esta peça não está no catálogo", busca e botão WhatsApp com o código na mensagem. Status HTTP 404. |
| Na cotação | Item na lista | Botão vira "✓ Na cotação" |

**Celular (≤ 640 px)**

- Topo: logo, botão WhatsApp (amarelo) e botão menu. Menu abre gaveta da esquerda com: Empresa, Segmentos, Estrutura, Catálogo, Contato, telefone clicável e WhatsApp.
- Filtros: fileira de chips com rolagem lateral (categorias). Segmento e ordem ficam no painel inferior "Filtrar e ordenar".
- Barra fixa "Minha cotação (n)" só com 1 item ou mais; respeita `env(safe-area-inset-bottom)`.
- Cotação abre em tela cheia.

## Fluxo de cotação via WhatsApp

A cotação fica só no navegador do cliente e sai como mensagem de WhatsApp; o servidor não guarda pedidos nem dados do cliente.

1. Cliente toca "+ Adicionar à cotação" no card ou no detalhe. A peça entra com quantidade 1, o botão vira "✓ Na cotação", o contador do topo sobe e aparece o aviso "Adicionado à cotação · Ver lista (n)".
2. Tocar de novo em "✓ Na cotação" remove a peça.
3. Na gaveta: ajustar quantidade (1 a 999), remover (com "Desfazer" por 5 s), preencher "Seu nome ou empresa" (opcional, máx. 80 caracteres).
4. "Enviar cotação pelo WhatsApp" abre `https://wa.me/{numero}?text={mensagem}` em nova aba (celular abre o app; computador abre o WhatsApp Web).
5. A gaveta mostra o estado "Pedido de cotação aberto no WhatsApp" com "Abrir de novo" e "Limpar lista e continuar". A lista **não** é apagada sozinha, porque o cliente pode não ter enviado.

**Armazenamento:** `localStorage` chave `falcao_cotacao_v1` = `{ "itens": [{ "codigo": "0103", "qtd": 1 }], "nome": "", "atualizado": "ISO-8601" }`. Expira em 30 dias sem uso. Sem `localStorage` (modo privado), funciona só em memória. Ao abrir, itens que sumiram ou foram ocultados são removidos e o aviso "1 peça saiu do catálogo e foi retirada da sua lista" aparece.

**Formato da mensagem** (o início vem de Configurações):

```
Olá! Gostaria de uma cotação pelo site:

• 1x cód.0103 – Cilindro mestre de freio
• 4x cód.0101 – Mola de patim – carreta guerra 240 mm

Nome/empresa: Transportes Silva
```

**Limites e casos extremos**

| Caso | Comportamento |
| --- | --- |
| Lista vazia | Botão enviar desativado; estado vazio com "Ver catálogo" |
| Mais de 50 peças distintas | Botão adicionar mostra aviso "Sua lista tem 50 peças. Envie esta cotação e comece outra." (limite a confirmar) |
| Mensagem passa de 1.800 caracteres | Nomes são cortados em 40 caracteres na mensagem; código nunca é cortado |
| Número do WhatsApp não configurado | Botões de WhatsApp somem e aparece o telefone; erro registrado para o administrador |
| Peça não encontrada na busca | Botão "Pedir essa peça no WhatsApp" envia: "Olá! Procuro a peça: {termo}" |
| Fora do horário de atendimento | Nada bloqueia; a tela de enviado mostra o horário |

## Administração, login e usuários

A administração fica em `bahiafalcao.com.br/admin`, só entra quem foi convidado, e existem dois papéis: Administrador e Editor. Não há cadastro aberto: toda conta nasce de um convite.

### Como o primeiro acesso acontece

1. Na instalação, o desenvolvedor roda um comando (ex.: `criar-admin --nome "João Silva" --email joao@bahiafalcao.com.br`) que cria o primeiro Administrador com convite pendente e envia o e-mail de convite. Nenhuma senha passa pelo desenvolvedor.
2. João abre o link, cria a senha (tela "Primeiro acesso") e entra.
3. A partir daí, novos usuários só entram por convite feito em **Usuários**.
4. O link "Administração" não aparece no site público; a equipe salva `/admin` nos favoritos.

### Papéis e permissões

| Ação | Administrador | Editor |
| --- | --- | --- |
| Ver, criar, editar, ocultar produtos | Sim | Sim |
| Excluir produtos | Sim | Sim |
| Categorias (criar, renomear, ordenar, excluir vazias) | Sim | Sim |
| Importar planilha | Sim | Sim |
| Usuários (convidar, editar papel, desativar, excluir, desbloquear) | Sim | Não (menu oculto; rota responde 403) |
| Configurações e registro de atividades | Sim | Não (menu oculto; rota responde 403) |
| Minha conta (nome, e-mail, senha, aparelhos) | Sim | Sim |

A permissão é checada **no servidor** em toda chamada; esconder o menu é só aparência.

### Regras de usuários

| Regra | Detalhe |
| --- | --- |
| Convite | Nome, e-mail e papel. E-mail único (inclusive entre desativados). Link vale 7 dias, uso único. "Reenviar convite" invalida o anterior. O administrador pode copiar o link para mandar por WhatsApp. |
| Situações | Convite pendente → Ativo → (Bloqueado) → Desativado → Excluído. Convite vencido aparece como "Convite expirado" com "Reenviar". |
| Editar | Administrador muda nome e papel. E-mail só a própria pessoa muda, em Minha conta, com confirmação no e-mail novo. |
| Mudar papel | Vale na próxima requisição (sem precisar sair). |
| Desativar | Corta o acesso na hora (encerra todas as sessões). Reversível com "Reativar". Produtos e histórico ficam. |
| Excluir | Exige digitar EXCLUIR. Apaga nome, e-mail e senha (LGPD); histórico passa a mostrar "Usuário excluído". Irreversível. |
| Proteções | Ninguém pode desativar, excluir ou rebaixar a si mesmo. Sempre deve existir pelo menos 1 Administrador ativo. |
| Bloqueio | 5 senhas erradas seguidas em 15 min → conta pausada 15 min (sugestão a confirmar). Administrador pode desbloquear antes, com ou sem envio de senha nova. |

### Regras de login e senha

| Regra | Detalhe |
| --- | --- |
| Login | E-mail + senha. Mensagem de erro sempre genérica ("E-mail ou senha incorretos"), para não revelar quais e-mails existem. "Conta desativada" só aparece após senha correta. |
| Senha | Mínimo 8 caracteres, com letras e números, diferente do e-mail. Checar contra lista de senhas vazadas comuns. Guardar com Argon2id ou bcrypt (custo ≥ 12). |
| Esqueci a senha | Sempre responde "Se o e-mail existir, enviamos um link". Link vale 1 hora, uso único. Máx. 3 pedidos por hora por e-mail. |
| Redefinir senha | Ao salvar, encerra todas as outras sessões e entra direto. |
| Sessão | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`. Expira com 8 h sem uso; "Manter conectado" estende para 30 dias. Ao expirar, aparece o modal "Você foi desconectado" e, depois de entrar, volta para a mesma tela. Alterações não salvas ficam em rascunho local. |
| Aparelhos | Minha conta lista sessões ativas (navegador, sistema, cidade aproximada, último uso) com "Desconectar" e "Sair de todos os outros". |
| Sair | No cabeçalho (menu do usuário) e em Minha conta. Encerra a sessão no servidor. |
| E-mails enviados | Convite, redefinir senha, confirmação de troca de e-mail, aviso "sua senha foi alterada", aviso "sua conta foi bloqueada". Remetente: `nao-responda@bahiafalcao.com.br` (a confirmar). |

### Matriz de estados – Acesso

| Tela | Estados | No design |
| --- | --- | --- |
| Login | Padrão, campo vazio (erro no campo), entrando, credenciais erradas, conta bloqueada, conta desativada, sem conexão (banner), sessão expirada (volta ao login com aviso) | Sim, menos "sem conexão" e "campo vazio" (usar componentes) |
| Esqueci a senha | Padrão, enviando, link enviado | Sim |
| Primeiro acesso (convite) | Padrão com regras de senha ao vivo, senhas diferentes, salvando, link expirado/usado | Sim |
| Redefinir senha | Mesmo do primeiro acesso | Sim |
| Senha salva | Sucesso e redireciona em 3 s | Sim |

### Matriz de estados – Produtos

| Tela | Estado | Comportamento |
| --- | --- | --- |
| Lista | Carregando | 8 linhas de esqueleto |
| Lista | Padrão | 25 por página, ordem por última alteração |
| Lista | Busca/filtro sem resultado | "Nenhum produto com 'xyz'" + "Limpar busca" |
| Lista | Vazia (primeiro acesso) | Estado desenhado: "Importar planilha" e "Cadastrar uma peça" |
| Lista | Chave Visível/Oculto salvando | Muda na hora; se falhar, volta e mostra aviso de erro |
| Lista | Erro ao carregar | Banner com "Tentar de novo" |
| Editar | Novo | Título "Novo produto", sem "Excluir" e sem histórico; botão "Criar produto" |
| Editar | Padrão | Mostra "Criado por… · Última alteração por…" |
| Editar | Erros de validação | Resumo no topo + erro em cada campo; foco vai ao primeiro erro |
| Editar | Código repetido | Erro no campo: "Já existe o cód.0103" com link para ele |
| Editar | Salvando / salvo / erro ao salvar | Botão carregando → aviso "Produto salvo. Já aparece no site." → ou aviso de erro mantendo os dados |
| Editar | Editado por outra pessoa ao mesmo tempo | Ao salvar: "Maria alterou este produto às 14:20. Ver as mudanças / Salvar mesmo assim" (controle por `atualizado_em`) |
| Editar | Sair sem salvar | Modal desenhado (também ao fechar a aba: aviso do navegador) |
| Editar | Foto | Arrastando, enviando com progresso, prévia com Trocar/Remover, erro "Use JPG, PNG ou WebP até 5 MB" |
| Editar | Excluir | Modal desenhado com alternativa "Ocultar do site" |

### Matriz de estados – Categorias, Usuários, Configurações, Minha conta

| Tela | Estados |
| --- | --- |
| Categorias | Padrão, adicionar (nome vazio/repetido = erro), renomear em linha (Enter salva, Esc cancela), arrastar para ordenar (salva ao soltar), excluir só se vazia (botão desativado com dica), confirmar exclusão |
| Usuários | Padrão, carregando, filtro por situação, convidar (modal), convite enviado, reenviar convite, convite expirado, editar, desativar, reativar, desbloquear, excluir com confirmação digitada, ação não permitida (último admin / a si mesmo), e-mail já cadastrado (erro no campo) |
| Configurações | Padrão, número inválido (erro), "Testar número", alterações não salvas (barra fixa), salvo |
| Registro de atividades | Lista com filtro por pessoa e período; guarda 12 meses |
| Minha conta | Dados salvos, troca de e-mail pendente ("Confirme no e-mail novo"), senha atual errada, senha trocada (encerra outras sessões), desconectar aparelho |
| Qualquer tela | Sem permissão (403: "Esta área é só para administradores" + voltar), página não existe (404), sessão expirada (modal) |

## Modelo de dados e API

Oito tabelas cobrem catálogo, usuários, sessões e histórico; nomes são sugestão, a estrutura é o que importa.

| Tabela | Campos principais | Regras |
| --- | --- | --- |
| `produto` | `id`, `codigo` (texto, único), `slug`, `nome`, `segmento` (enum: linha\_pesada, carretas, ferramentas), `categoria_id`, `aplicacao` (texto), `codigo_original`, `similares` (lista de texto), `especificacoes` (lista {nome, valor}), `foto_url`, `visivel` (bool, padrão true), `criado_por`, `criado_em`, `atualizado_por`, `atualizado_em` | `codigo` normalizado sem espaços nas pontas; índice de busca sem acentos em código, original, similares, nome, aplicação |
| `produto_veiculo` | `id`, `produto_id`, `montadora`, `veiculo`, `detalhe`, `ano_texto`, `ordem` | Apaga junto com o produto |
| `categoria` | `id`, `nome` (único), `slug`, `ordem` | Não exclui com produtos |
| `usuario` | `id`, `nome`, `email` (único, minúsculo), `senha_hash`, `papel` (admin, editor), `situacao` (convidado, ativo, desativado), `tentativas_falhas`, `bloqueado_ate`, `ultimo_acesso`, `criado_em`, `convidado_por` | Exclusão apaga dados pessoais e mantém o `id` para o histórico |
| `token` | `id`, `usuario_id`, `tipo` (convite, redefinir\_senha, trocar\_email), `hash`, `expira_em`, `usado_em`, `email_novo` | Guardar só o hash do token; uso único |
| `sessao` | `id`, `usuario_id`, `criada_em`, `ultimo_uso`, `expira_em`, `navegador`, `ip`, `cidade` | Revogar = apagar a linha |
| `atividade` | `id`, `usuario_id` (ou sistema), `acao`, `alvo_tipo`, `alvo_id`, `resumo`, `criado_em` | Registrar: login, falha de login, bloqueio, CRUD de produto/categoria, importação, ações em usuários, mudança de configuração. Guardar 12 meses |
| `configuracao` | chave/valor: `whatsapp_numero`, `whatsapp_inicio_mensagem`, `telefone_0800`, `telefone_direto`, `horario_semana`, `horario_sabado` | Cache no site público; invalidar ao salvar |

**API pública** (sem login; só produtos visíveis; cache curto de 60 s)

| Método e rota | Uso |
| --- | --- |
| `GET /api/produtos?q=&segmento=&categoria=&ordem=&pagina=` | Lista; 24 por página; retorna `total` e contagens por segmento e categoria para os filtros |
| `GET /api/produtos/{codigo}` | Detalhe + aplicações + até 4 relacionadas (mesma categoria) |
| `GET /api/produtos/lote?codigos=0103,0101` | Revalida itens da cotação guardada |
| `GET /api/configuracao-publica` | Número, início da mensagem, telefones, horário |

**API da administração** (cookie de sessão + token CSRF; papel checado em cada rota)

| Método e rota | Papel |
| --- | --- |
| `POST /api/admin/login` · `POST /logout` · `POST /esqueci-senha` · `POST /redefinir-senha` · `POST /aceitar-convite` | Público (com limite de tentativas) |
| `GET/POST /api/admin/produtos` · `GET/PUT/DELETE /produtos/{id}` · `PATCH /produtos/{id}/visivel` · `POST /produtos/{id}/foto` | Editor+ |
| `GET/POST /api/admin/categorias` · `PUT/DELETE /categorias/{id}` · `PUT /categorias/ordem` | Editor+ |
| `POST /api/admin/importacoes` (envia e valida, devolve prévia) · `POST /importacoes/{id}/confirmar` · `GET /importacoes/{id}` (progresso) | Editor+ |
| `GET/PUT /api/admin/minha-conta` · `PUT /minha-conta/senha` · `GET/DELETE /minha-conta/sessoes/{id}` | Qualquer logado |
| `GET/POST /api/admin/usuarios` · `PUT/DELETE /usuarios/{id}` · `POST /usuarios/{id}/reenviar-convite` · `/desativar` · `/reativar` · `/desbloquear` | Administrador |
| `GET/PUT /api/admin/configuracoes` · `GET /atividades` | Administrador |

Erros sempre como `{ "erro": "codigo_maquina", "mensagem": "Texto para a pessoa", "campos": { "codigo": "Já existe o cód.0103" } }`, para a tela mostrar o erro no campo certo.

## Importação de planilha

A importação cria ou atualiza produtos pelo código, valida tudo antes de gravar e nunca apaga produtos que não estão na planilha.

**Arquivo:** `.xlsx` ou `.csv` (UTF-8, separador `;` ou `,`), até 10 MB e 10.000 linhas. O modelo para baixar tem duas abas: `produtos` e `aplicacoes`. Cabeçalhos são reconhecidos sem diferenciar maiúsculas e acentos.

**Aba `produtos`**

| Coluna | Obrigatória | Formato | Exemplo |
| --- | --- | --- | --- |
| codigo | Sim | Texto. Zeros à esquerda mantidos (ler a célula como texto) | 0103 |
| nome | Sim | Até 150 caracteres | Cilindro mestre de freio |
| categoria | Sim | Nome de uma categoria existente | Freios |
| segmento | Sim | Linha pesada, Carretas ou Ferramentas | Linha pesada |
| aplicacao | Não | Texto curto | Ford Ranger 2001–2012 |
| codigo\_original | Não | Texto | HFCM 2313 |
| similares | Não | Separados por `/` | MP005 / 8005 / 17013 |
| especificacoes | Não | `Nome: valor` separados por `;` | Comprimento: 240 mm; Arame: Ø 4 mm |
| visivel | Não | sim / não (vazio = sim) | sim |

**Aba `aplicacoes`:** codigo, montadora, veiculo, detalhe, ano. Se um código aparece aqui, as aplicações dele são substituídas pelas da planilha.

**Validações (cada uma vira uma linha com erro, em português simples)**

- Falta código, nome, categoria ou segmento.
- Código repetido dentro da planilha ("já aparece na linha 41").
- Categoria que não existe ("Crie a categoria 'Embreagem' antes ou corrija o nome").
- Segmento fora da lista; `visivel` diferente de sim/não.
- Arquivo com colunas obrigatórias faltando → o arquivo inteiro é recusado, listando as colunas que faltam.

**Estados da tela**

| Estado | O que mostra |
| --- | --- |
| Sem arquivo | Passo 1 (baixar modelo) e área para soltar o arquivo |
| Arrastando | Borda amarela na área |
| Lendo arquivo | Spinner "Lendo 131 linhas…" |
| Arquivo inválido | Erro no passo 2: tipo, tamanho ou colunas faltando |
| Revisão (desenhado) | Contagem de novas, atualizadas e com erro + tabela de erros; botão "Importar N peças" |
| Tudo com erro | Botão desativado; "Corrija a planilha e envie de novo" + "Baixar linhas com erro" |
| Importando | Barra de progresso "Importando 64 de 128…"; aviso para não fechar (o processo continua no servidor mesmo se fechar) |
| Concluída (desenhado) | Resumo + "Ver produtos" + "Baixar linhas com erro" (.xlsx com coluna "erro") |
| Falha no servidor | Nada é gravado (transação única); "Tente de novo" |

Fotos não entram pela planilha nesta versão; produto sem foto aparece com "Foto em breve".

## Requisitos não funcionais

O catálogo precisa abrir rápido no 4G, ser encontrado no Google peça por peça e cumprir WCAG 2.1 AA.

| Área | Requisito | Como verificar |
| --- | --- | --- |
| Desempenho | LCP < 2,5 s e INP < 200 ms no celular em 4G | Lighthouse / PageSpeed na página de lista e de detalhe |
| Desempenho | Busca responde em < 300 ms (p95) com 10.000 produtos | Teste de carga com base de 10 mil itens |
| Desempenho | Fotos em WebP, 400 e 800 px (`srcset`), carregamento preguiçoso abaixo da dobra; reprocessar no envio | Inspeção de rede |
| SEO | Páginas renderizadas no servidor (não só JavaScript) | Ver código-fonte da página |
| SEO | Título do detalhe: "cód.0103 – Cilindro mestre de freio \| Falcão Distribuidora"; meta description com aplicação | Inspeção |
| SEO | Dados estruturados schema.org `Product` (nome, sku, mpn = código original, image, brand) sem preço | Teste de pesquisa aprimorada do Google |
| SEO | `sitemap.xml` com todas as peças visíveis; `canonical` sem parâmetros de filtro; `/admin` com `noindex` e fora do sitemap | Search Console |
| Acessibilidade | Contraste 4,5:1 em texto; 44 px de alvo; tudo operável por teclado com foco visível; labels em todos os campos | axe DevTools + navegação só com teclado |
| Acessibilidade | Contador da cotação e avisos em região `aria-live`; modais e gavetas prendem o foco | Leitor de tela (NVDA ou TalkBack) |
| Acessibilidade | `prefers-reduced-motion` desliga animações e brilho dos esqueletos | Configuração do sistema |
| Segurança | HTTPS, HSTS, CSP; cookies `HttpOnly`/`Secure`; CSRF nas rotas da administração | Revisão de código |
| Segurança | Limite de tentativas: login, esqueci a senha, aceitar convite (por IP e por e-mail) | Teste manual |
| Segurança | Upload: validar tipo real do arquivo, reprocessar imagens (remove metadados e código), limite 5 MB; planilha 10 MB | Envio de arquivo malicioso de teste |
| Segurança | Todo texto vindo da administração é escapado no site (evita XSS) | Teste com `<script>` no nome |
| Privacidade (LGPD) | Cotação não é salva no servidor; dados de usuários excluídos são apagados; registro de atividades 12 meses | Revisão |
| Operação | Backup diário do banco e das fotos, retenção 30 dias; teste de restauração antes de publicar | Restaurar em ambiente de teste |
| Navegadores | Chrome, Edge, Safari e Firefox (2 últimas versões); Android 9+ e iOS 15+ | Teste manual |

**Eventos de analytics** (GA4 ou equivalente)

| Evento | Parâmetros |
| --- | --- |
| `busca` | termo, total\_resultados |
| `busca_sem_resultado` | termo |
| `filtro_aplicado` | tipo, valor |
| `ver_produto` | codigo, origem (lista, busca, relacionadas) |
| `adicionar_cotacao` / `remover_cotacao` | codigo, origem |
| `enviar_cotacao` | qtd\_itens, qtd\_total |
| `clique_whatsapp` | origem (topo, sem resultado, detalhe, rodapé) |

`busca_sem_resultado` é o relatório mais valioso: mostra as peças que os clientes procuram e o catálogo ainda não tem.

## Decisões em aberto e critérios de aceite

Oito decisões precisam de resposta da Falcão antes do desenvolvimento começar; as sugestões já estão aplicadas no design.

**Decisões em aberto**

- [ ] Tecnologia do site atual (WordPress, HTML, outro) e se o catálogo roda dentro dele ou em subdomínio. Muda a stack inteira.
- [ ] Serviço de e-mail para convites e senhas (ex.: SMTP do domínio, Amazon SES, Brevo) e endereço remetente.
- [ ] Regras de segurança: bloqueio após 5 tentativas por 15 min; sessão de 8 h (30 dias com "Manter conectado"); convite 7 dias; link de senha 1 hora.
- [ ] Limite de peças por cotação (sugestão: 50).
- [ ] Editor pode excluir produtos ou só ocultar? (sugestão: pode excluir).
- [ ] Quem será o primeiro Administrador (nome e e-mail).
- [ ] Fotos: quem fotografa, padrão (fundo claro, 1:1) e se haverá mais de 1 foto por peça.
- [ ] Arquivos finais da logo (horizontal e símbolo).

**Critérios de aceite**

- [ ] Todas as telas e estados das matrizes (seções 5, 6, 7 e 9) implementados e conferidos contra o design.
- [ ] Busca por código, original, similar, nome e veículo funciona sem acento e com hífen/ponto.
- [ ] Cotação com 3 peças abre o WhatsApp com a mensagem exatamente no formato da seção 6, no celular e no computador.
- [ ] Cotação continua depois de fechar e abrir o navegador; peça ocultada sai da lista com aviso.
- [ ] Editor não acessa Usuários nem Configurações nem pela URL nem pela API (403).
- [ ] Não é possível ficar sem Administrador ativo, nem desativar/excluir a própria conta.
- [ ] Convite, redefinição de senha e troca de e-mail funcionam ponta a ponta e os links não funcionam duas vezes.
- [ ] Desativar um usuário derruba as sessões dele na hora.
- [ ] Importação de planilha com 10.000 linhas termina, mostra erros por linha e não grava nada se o servidor falhar.
- [ ] Registro de atividades mostra quem fez cada alteração de produto, usuário e configuração.
- [ ] Lighthouse ≥ 90 em Desempenho, Acessibilidade e SEO nas páginas públicas; axe sem erros críticos.
- [ ] Navegação completa só com teclado, inclusive gaveta e modais.
- [ ] Backup restaurado com sucesso em ambiente de teste antes de publicar.
