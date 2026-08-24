# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [3.8.6] - 2026-08-24

### Adicionado
- Interface genérica para provedores de assistência de IA com declaração obrigatória de transporte por proxy seguro, identificação de modelo e garantia de que nenhum segredo é exposto ao cliente.
- Fronteira de dados mínima para NPCs, validador de JSON estrito e serviço de propostas assistidas com auditoria limitada em memória.
- Painel `[TESTE - AI]` em `NPC Mechanics`, com estado disponível/indisponível, explicação de privacidade, prévia identificada como `AI ASSISTED` e decisões explícitas de aprovação ou rejeição.
- API `game.ethernum.ai` para consultar o estado e, somente como mestre, registrar provedores seguros e inspecionar a auditoria da sessão.

### Alterado
- A IA pode somente refinar campos textuais de uma definição determinística existente; componentes, operações, custo de ações, dano, CD, orçamento e limites de poder permanecem canônicos.
- Aplicação de proposta assistida exige decisão aceita. Propostas pendentes ou rejeitadas são recusadas também na camada de serviço, independentemente da interface.
- Erros de provedor, JSON ou schema ficam contidos na assistência e nunca interrompem a geração determinística.

### Segurança
- O módulo não contém adaptador de provedor ao vivo, endpoint direto, chave de API, cabeçalho de autorização, configuração de segredo, `fetch` de IA ou persistência em `localStorage`/setting do mundo.
- Journals, mensagens privadas, notas secretas de mestre, fichas e inventários alheios, exportações do mundo e credenciais são excluídos do contexto permitido.
- Saída do provedor tem limite de 64 KB, chaves extras são recusadas e nenhum JavaScript ou texto executável é aceito.

### Testes
- 85 arquivos e 613 testes automatizados cobrem modo indisponível, registro seguro, fronteira de dados, JSON inválido, falha de schema, proposta válida, preservação mecânica, aprovação, rejeição, erro do provedor, permissão GM e aplicação protegida.
- O painel indisponível e sua fronteira de dados foram inspecionados no Foundry; Loja, configurações do Comunicador e abas PF2e de Inventário, Ações e Efeitos passaram por verificação cruzada sem erro do módulo.
- Evidências e relatório ficam em `docs/qa/v3.8.6/`.

### Experimental
- Toda a assistência de IA permanece `[TESTE - AI]` e indisponível por padrão até existir um backend/proxy seguro aprovado.

## [3.8.5] - 2026-08-24

### Adicionado
- Gerador offline e determinístico de Mecânica Única para NPCs PF2e, com análise de nível, traits, tamanho, deslocamentos, Strikes, dano, conjuração, defesas, resistências, ações e reações.
- Classificação ponderada nos papéis Brute, Skirmisher, Controller, Artillery, Defender, Support, Caster, Boss e Hybrid.
- Treze famílias declarativas experimentais: Aura, Charge, Reaction, Counter, Mark, Resource, Phase, Finisher, Summon, Hazard, Movement, Zone e Escalation.
- Área `NPC Mechanics` no Command Device com geração reproduzível, prévia, edição restrita a textos, orçamento de poder, aplicação explícita e reversão da última aplicação.
- Serviço versionado em flag própria que materializa somente Items PF2e nativos do tipo Action e preserva perfis autorais e Items manuais.

### Alterado
- A análise de deslocamento usa `system.movement.speeds` do PF2e atual, com fallback compatível somente pela fonte persistida e sem acionar o getter obsoleto.
- Aplicar e reverter passam pela fachada administrativa e pela Authority Bridge existentes, com idempotência e auditoria.
- O estado gerado registra origem, versão, horário, semente, fingerprint do Actor, templates e orçamento consumido.

### Segurança
- Definições geradas são dados declarativos validados; JavaScript arbitrário, `eval`, `new Function`, texto de macro e expansão dinâmica de `UniqueMechanicProfileId` não são aceitos.
- O Actor é reanalisado imediatamente antes da aplicação; prévias antigas são recusadas quando as estatísticas mudam.
- Conteúdo manual exige confirmação explícita, e falhas restauram flag e Items anteriores por compensação.

### Testes
- 83 arquivos e 601 testes automatizados cobrem determinismo, papéis, 13 templates, orçamento, schema, movimento PF2e atual, separação arquitetural, aplicação idempotente, rollback e proteção manual.
- Smoke test autenticado no Foundry gerou uma mecânica Boss 9/9 para o Adamantine Dragon sem avisos do módulo ou da API obsoleta de deslocamento.
- Evidências e relatório ficam em `docs/qa/v3.8.5/`.

## [3.8.4] - 2026-08-24

### Adicionado
- Gerador de Loot determinístico no `ETHERNUM COMMAND DEVICE`, com nível do grupo/encontro, faixa de Item, raridade, categoria, tipo, traits, orçamento, fontes permitidas e semente reproduzível.
- Catálogo de geração baseado exclusivamente em Items PF2e físicos reais do mundo e de compêndios; resultados inexistentes permanecem vazios e nunca fabricam registros substitutos.
- Manifesto preview-first com itens, moeda restante, candidato especial, alertas, regeneração, publicação no chat e entrega explícita para Actor PF2e do tipo Loot.
- Ledger administrativo de loot com idempotência persistente, criação de Items reais, moedas PF2e, rollback e estado de recuperação.
- Analisador somente leitura do encontro atual, com média de nível, ajuste pelo tamanho do grupo, orçamento PF2e, contribuição por criatura, preferência por XP preparado e alertas de composição.

### Alterado
- O Command Device ganhou as áreas funcionais `Loot` e `Encounter`, substituindo os espaços planejados sem criar um segundo plano de autoridade.
- A seleção inicial de fontes do gerador usa Itens do mundo e `Equipment`; o mestre pode incluir ou remover qualquer compêndio de Item.
- GMs secundários podem consultar a Loja para renderizar o dispositivo administrativo, enquanto mutações continuam exclusivas do mestre primário pela Authority Bridge.
- O painel administrativo observa abertura, movimento e redimensionamento do Field Communicator e corrige colisões tardias entre os dois dispositivos.
- A apresentação de chat usa `renderChatMessageHTML` no Foundry 13+ e inclui layout próprio, escopado, para manifestos de loot.

### Segurança
- Geração e análise não alteram Actors; entrega e chat exigem comando GM explícito, validado e auditado.
- A entrega revalida Actor Loot, UUID e tipo físico de cada Item, fecha novamente o orçamento e rejeita payload adulterado antes de tocar no mundo.
- Aplicações usam ID persistente para impedir entrega duplicada e compensam Items/moedas quando uma etapa posterior falha.

### Testes
- Testes automatizados cobrem determinismo, filtros inválidos, metadata de índice PF2e, orçamento, cálculo de encontro, XP preparado, idempotência, rollback, chat sanitizado e leitura por GM secundário.
- Smoke test autenticado no Foundry indexou 1.105 candidatos do compêndio Equipment em menos de um segundo e analisou o combate real sem erros do módulo.
- Evidências e relatório ficam em `docs/qa/v3.8.4/`.

## [3.8.3] - 2026-08-19

### Adicionado
- `ETHERNUM COMMAND DEVICE`, terminal exclusivo do mestre com Operações, Contratos, Equipes, Inteligência, Loja, Requisições, Recompensas, Broadcast, Auditoria e Sistema.
- Fachada administrativa única sobre os serviços existentes, com comandos auditados para publicar contratos, administrar ofertas, editar identidades, distribuir recompensas e transmitir comunicados.
- Diretório seguro de identidades da Companhia em Journal de mestre, com migração idempotente dos aliases antigos e projeções individuais para jogadores.
- Ledger transacional de recompensas com Items PF2e, moedas, metadados de XP/EP, comendas, idempotência, compensação e estados de recuperação.
- Broadcasts INFO, WARNING e CRITICAL persistidos como ChatMessages do mestre e exibidos no Comunicador conforme destinatário.
- Prévia de jogador identificada e somente leitura, com encerramento explícito e bloqueio de aplicativos externos, compras e mutações.

### Alterado
- A fila de requisições da Loja agora permite ao mestre inspecionar diretamente o Actor e o Item PF2e envolvidos.
- Patente editada no diretório seguro passa a sincronizar a autorização da Loja, sem confiar em flags editáveis pelo jogador.
- Inteligência de contratos aceita limiares de 0 a 5 por anexo e oculta o conteúdo até o desbloqueio correspondente.
- Edições de contratos, Loja e identidades são serializadas e protegidas por revisão para evitar perda silenciosa entre mestres.
- O Dispositivo Administrativo evita posições persistidas sobre o Comunicador de Campo e continua abaixo das janelas nativas do Foundry.
- A prévia segura remonta o Comunicador ao entrar e sair, inclusive quando ele já estava aberto na tela inicial.
- Criação, edição e exclusão de broadcasts atualizam automaticamente os dois dispositivos.

### Segurança
- Requisições remotas da Authority Bridge recebem atestação vinculada ao User do Foundry; autoria forjada, payload excessivo e identificadores inválidos são rejeitados e auditados.
- Jogadores recebem apenas suas próprias entradas de fila/auditoria pelas APIs e não recebem controles administrativos no DOM.
- Registros administrativos de identidades e recompensas usam Journals com permissão padrão `NONE`; apenas projeções sanitizadas são observáveis.
- Inicializações de identidade e recompensa ficam restritas ao mestre primário para evitar disputa entre sessões GM.

### Testes
- 77 arquivos e 575 testes automatizados cobrem os novos modelos, idempotência de recompensas, broadcasts privados, navegação administrativa e barreiras de prévia.
- Evidências do smoke test autenticado e da inspeção visual ficam em `docs/qa/v3.8.3/`.

## [3.8.2] - 2026-08-19

### Adicionado
- `CompanyStoreService` com catálogo de Items PF2e reais, preço atual ou sobrescrito, estoque finito/ilimitado, Rank, região, autorizações e modos automático/aprovação.
- Transações persistentes identificadas por ID, com estágios auditáveis, concessão de Item sem empilhamento e recuperação após troca do mestre primário.
- Catálogo, detalhe e recibo próprios no Comunicador, exibindo imagem, nível, raridade, preço, saldo PF2e, estoque e motivo textual de autorização.
- API `game.ethernum.store` para consulta e compra, com administração exclusiva do mestre para entradas, estoque, autorizações e reconciliação.

### Alterado
- O antigo fluxo de pedido por whisper foi substituído por compra PF2e funcional; ofertas antigas são importadas uma única vez em modo de aprovação.
- O saldo vem diretamente de `Actor.inventory.coins`, e débito/estorno/concessão usam as APIs públicas do inventário PF2e.
- Requisições especiais usam a fila, políticas, auditoria e autoridade já existentes, sem criar um segundo plano de controle.
- Cada jogador recebe um Journal-projeção individual contendo somente DTOs públicos do próprio catálogo e saldo.
- Preços gratuitos (`0 cp`) agora são aceitos como valores PF2e válidos.
- Linhas do catálogo usam altura de conteúdo própria e não sobrepõem nome, autorização, preço ou estoque.
- A criação de Journals preserva o contexto da classe de documento exigido pelo Foundry v14, tanto na Loja quanto no Arquivo de Contratos.

### Segurança
- A autoria de cada compra é atestada por ChatMessage criada pelo Foundry e revalidada pelo mestre junto a usuário, Actor, oferta, modo, revisão e preço.
- Estoque e dinheiro são serializados sob lock; cotações antigas, UUIDs quebradas, modo adulterado, jogador sem ownership e Item sem permissão são rejeitados.
- Falhas após débito removem Items concedidos e estornam moedas; estados ambíguos são bloqueados como `recoveryRequired` e alertados ao mestre.
- Dados administrativos, UUIDs de Item, restrições, autorizações, migrações e transações nunca entram nas projeções dos jogadores.

### Testes
- Cobertura automatizada para moedas exatas/mistas/insuficientes, estoque 1/0, clique duplo, aprovação, UUID quebrada, permissão, cotação stale, spoof de autoria, rollback e falha de rollback.
- Smoke test autenticado no Foundry valida catálogo, detalhe, compra automática, estoque esgotado, aprovação, entrega final e integração com o Centro de Controle GM.
- Regressão dedicada reproduz o contrato de `this` usado por `CONFIG.JournalEntry.documentClass.create` no Foundry v14.
- Evidências visuais e relatório estão em `docs/qa/v3.8.2/`.

## [3.8.1] - 2026-08-19

### Adicionado
- Serviço versionado de Arquivo de Contratos com publicação, arquivamento, ativação, conclusão, concessão e revogação de acesso exclusivas do mestre.
- Aplicativo Contratos com grupos Ativo, Disponíveis, Concluídos e Arquivados, detalhe operacional, recompensas, anexos e dossiês.
- Visualizador interno baseado em PDF.js com canvas, página anterior/seguinte, zoom de 50% a 200%, ajuste por largura e ajuste por página.
- Suporte seguro no mesmo leitor para PDF, Journal, imagem, texto e dossiê, com fallback para abertura externa revalidada.
- Relatório canônico do Contrato 01, Operação Manifesto 13, com 13 páginas e capa oficial.
- Projeções Foundry separadas por contrato e documento para que cada jogador receba somente conteúdo observável.

### Alterado
- O botão Voltar do Comunicador agora desfaz primeiro leitor, detalhe e arquivo antes de retornar à tela inicial.
- Estado de contrato e leitor sobrevive à minimização/reabertura e cada destino é revalidado antes de renderizar ou abrir externamente.
- Journals antigos reconhecidos como contratos são importados de forma idempotente, preservando documentos e campos desconhecidos.
- A troca de mestre primário durante a sessão inicializa o armazenamento administrativo e sincroniza as projeções sem exigir recarga do mundo.

### Segurança
- Registro administrativo e regras de visibilidade permanecem em Journal exclusivo de mestre, nunca em setting de mundo entregue aos jogadores.
- Anexos possuem ACL independente; permissão do documento de origem é conferida novamente antes de projetar seu conteúdo.
- Caminhos estáticos aceitam somente assets públicos dentro do diretório do módulo e rejeitam travessia, esquemas executáveis e caminhos arbitrários do mundo.
- Mutações são exclusivas do mestre, usam revisão esperada para detectar edição concorrente e impedem múltiplos contratos ativos.
- O leitor usa canvas sem `iframe`, `eval` ou HTML executável; conteúdo textual derivado de Journal é normalizado para texto simples.

### Testes
- Testes automatizados cobrem schema, migração, ACL, projeções, mutações, troca de autoridade primária, navegação do leitor, limites de zoom e fallback de PDF.
- Smoke test autenticado no Foundry confirmou arquivo, detalhe, relatório de 13 páginas, canvas não vazio, navegação por botão/teclado e retorno local em três níveis.
- Evidências visuais e relatório estão em `docs/qa/v3.8.1/`.

## [3.8.0] - 2026-08-19

### Adicionado
- Ciclo de vida finito para o Comunicador com estados `idle`, `opening`, `open`, `closing` e `minimized`, tokens monotônicos e descarte de conclusões atrasadas.
- Abertura física com expansão do aparelho, varredura curta de autenticação e restauração da tela atual.
- Desligamento Z-Flip em CSS 3D pelo botão de energia, com escurecimento da tela, dobra superior/inferior e retorno ao launcher.
- Registry compartilhado para os namespaces `ETH-UI`, `CON-UI` e `COM-UI`; os slots do Comunicador permanecem marcados como aguardando assets canônicos.
- Microinterações de circuito, pressão, confirmação ciano, entrada de badges, navegação direcional e acesso negado controlado.

### Alterado
- Modos de movimento Completo, Reduzido e Desligado agora controlam também abertura e encerramento do aparelho.
- O painel, os recentes e a tela atual sobrevivem à minimização e são revalidados ao reabrir.
- Rodapé compacto mantém cinco ações visíveis sem rolagem horizontal, e o tamanho mínimo respeita viewports menores que 320 px.
- Boot pulável aparece apenas quando realmente pode ser pulado e torna cabeçalho, conteúdo e rodapé inertes durante a autenticação.

### Segurança
- Snapshots de jogador não transportam URLs/UUIDs privados, regras de desbloqueio, listas de agentes/esquadrões, preview de usuários ou o registro administrativo.
- Abertura de aplicativo personalizado resolve novamente o registro e repete as verificações de Rank, desbloqueio e permissão do documento.
- Navegação direta para painéis ausentes do snapshot autorizado é rejeitada e produz o estado visual de acesso negado.

### Corrigido
- Montagens concluídas após o host ter sido removido não podem mais anexar controladores órfãos.
- Cliques assíncronos duplicados são coalescidos e respostas antigas não substituem uma navegação mais recente.
- Setas e Escape não são sequestrados dentro de campos de formulário; gestos de arraste/redimensionamento encerram também em cancelamento ou perda de foco.
- Removida a ação sem implementação “Abrir documento original” do cabeçalho de painéis internos.

### Testes
- Suíte automatizada, typecheck, build, validação da distribuição e smoke test visual no Foundry cobrem ciclo de vida, permissões, Z-Flip, autenticação curta, restauração de painel e layout compacto.

## [3.7.9] - 2026-08-19

### Adicionado
- Leitura canônica de moedas PF2e com apresentação dedicada de platina, ouro, prata e cobre no inventário.
- Modelo explícito para variantes preparadas de Strike, preservando índice, rótulo, modificador e estágio de MAP.
- ECG animado por estado de PV e registro central de microanimações para os sete perfis existentes.
- Protocolo de desenvolvimento HARVEST, registro de testes experimentais e roadmap integral de v3.7.9 a v3.8.6.

### Alterado
- Barra de PV passa a ser uma camada independente ancorada diretamente ao monitor e responde imediatamente à edição antes de reconciliar com o Actor PF2e.
- Divisores `ETH-UI-02` e `ETH-UI-13` preservam a proporção original, e a ficha passa a verificar o carregamento dos 14 assets oficiais.
- Ataques exibidos e executados usam a mesma variante preparada pelo PF2e, inclusive para armas ágeis, efeitos e modificadores personalizados.

### Corrigido
- Removida a largura artificial de `303%` que desalinhava o preenchimento de PV.
- Moedas deixam de aparecer como linhas comuns de tesouro sem ocultar gemas, arte e outros tesouros reais.
- Estado visual de PV zero passa a usar flatline; dano, cura e preferências Full/Reduced/Off continuam respeitados.

### Testes
- 504 testes automatizados cobrem PV otimista e reconciliado, moedas preparadas/fallback, filtro de tesouro, variantes MAP, assets proporcionais e movimento por perfil.
- Build e distribuição validados antes do smoke test visual no Foundry.

## [3.7.8] - 2026-08-10

### Adicionado
- Metadados ópticos para os 14 assets oficiais, incluindo tamanho preferencial, limites responsivos, escala, opacidade, encaixe e área interna.
- Arraste livre do ícone minimizado do Comunicador, com trava explícita e posição persistente por mundo e usuário.

### Alterado
- Cabeçalho Ethernum passa a usar uma linha exclusiva para ações e uma composição independente para retrato, identidade, Rank, PV e pontos heroicos.
- Retrato, Rank, monitor de PV, abas, cantos, divisores, fundos rúnicos, marcadores de recurso e acentos de perícia foram recalibrados pelos limites ópticos reais dos assets.
- Tamanho padrão da ficha Ethernum foi ampliado para acomodar os instrumentos oficiais sem comprimir a identidade do personagem.

### Corrigido
- Ações do cabeçalho não ocupam mais o espaço do Rank ou do monitor de PV.
- Retrato oficial deixa de herdar o limite antigo de 94 px e usa 150 × 172 px na composição padrão.
- Gemas de recursos não desaparecem por redução excessiva e os frames completos das abas permanecem visíveis.
- Imagens transparentes deixam de herdar borda, fundo ou sombra genéricos do Foundry.
- Runas, cantos e divisores recuperam presença sem reduzir contraste ou interceptar interação.
- O Comunicador minimizado deixa de ficar preso aos controles de mensagem do chat.

### Testes
- Contratos automatizados cobrem metadados ópticos, composição do cabeçalho, frames das abas, gemas e persistência do launcher.
- Smoke test no Foundry confirmou dimensões-alvo do cabeçalho, nove abas funcionais e arraste/trava persistente do Comunicador.

## [3.7.7] - 2026-08-09

### Adicionado
- Pacote canônico com 14 assets oficiais da Ethernum Company, distribuídos em WebP lossless e registrados por ID, função e metadados de uso.
- Templates próprios para shell, cabeçalho e navegação Ethernum, mantendo componentes funcionais compartilhados com a arquitetura PF2e existente.
- Preloader dos assets críticos, fallback não bloqueante para arquivos ausentes e relatório visual no diagnóstico da ficha.
- Ferramenta GM de sobreposição de referência com caminho configurável, opacidade, escala, deslocamento e ajuste por largura ou altura.
- Modo local de alto contraste para reduzir texturas, runas e ornamentação secundária.
- Serviço centralizado de identidade corporativa para codinome, Rank, esquadrão, departamento e estado operacional.

### Alterado
- Cabeçalho Ethernum passa a usar molduras oficiais no retrato, Rank, monitor de PV, pontos heroicos e navegação.
- Painéis, perícias, divisores, fundos rúnicos e recursos usam a composição visual oficial sem substituir dados ou ações PF2e.
- Assets originais permanecem intactos fora do módulo; as cópias públicas foram comprimidas sem perda visual para reduzir carregamento e memória.

### Corrigido
- Rank da Company não utiliza mais o nível PF2e como fallback na ficha ou no Comunicador; a ausência de Rank explícito agora aparece como `—`.
- Ornamentos, frames e overlays não interceptam cliques nem recebem as regras de dimensionamento das thumbnails de conteúdo.
- Atalhos da Mecânica Única permanecem legíveis dentro do novo terminal, sem fundo claro ou perda de área clicável.
- A ferramenta de referência redesenha a ficha ao ser ligada, desligada ou reajustada.

### Testes
- Contratos automatizados cobrem registry, fallback, templates, identidade corporativa, acessibilidade, movimento, responsividade, referência e diagnóstico.
- Smoke test em Foundry 13.351 com PF2e 7.8.0 confirmou 14/14 assets, nove abas, Pipping, PF2e fallback e isolamento do Comunicador.

## [3.7.6] - 2026-08-09

### Adicionado
- Comunicador de Campo Ethernum persistente fora das fichas, acessível a jogadores e mestres.
- Onze aplicativos oficiais: Ficha, Conversas, Grupo, Esquadrão, Mapa, Manual, Dossiês, Contratos, Arquivos, Loja e Ajustes.
- Registro mundial versionado para aplicativos oficiais e personalizados, com migração, sanitização, importação, exportação e restauração segura.
- Mensagens privadas e de grupo integradas ao ChatMessage nativo, além de solicitações de compra enviadas ao mestre.
- Administração GM com criação, edição, duplicação, ativação, remoção, reordenação por arraste ou teclado e pré-visualização como jogador.
- Sequências de inicialização completa, abreviada, pulável e desativada, com preferências locais de acessibilidade.
- API pública em `game.ethernum.ui` para abrir, fechar, alternar e atualizar o comunicador.

### Alterado
- O logotipo oficial da Ethernum Company passa a ser usado no núcleo de autenticação, no cabeçalho e na tela inicial do aparelho.
- Documentos, cenas, itens, compêndios, pastas e links externos usam adaptadores declarativos e as permissões originais do Foundry.
- A grade aceita aplicativos adicionais e mantém cabeçalho, viewport rolável e navegação inferior estáveis em tamanhos compactos e largos.

### Segurança
- Aplicativos não podem executar JavaScript arbitrário; rótulos, descrições, ícones, IDs e destinos são normalizados antes do uso.
- Links externos exigem confirmação e UUIDs inválidos não interrompem a interface.
- Filtros narrativos de Rank, agente, esquadrão e desbloqueio nunca substituem a permissão do documento de destino.
- Remover um atalho preserva o Actor, Item, Scene, JournalEntry, Folder ou Compendium correspondente.

### Testes
- 471 testes automatizados cobrem registro, migração, 8/16/30/60 aplicativos, navegação, boot, teclado, ciclo de vida, segurança e integração externa à ficha.

## [3.7.5] - 2026-08-09

### Adicionado
- Identidade visual exclusiva da ficha Concórdia como grimório mecânico em cobre, latão, couro escuro e energia arcana ciano.
- Papéis semânticos de material para metal, couro, pergaminho, vidro, arcano e instrumentos mecânicos.
- Tubo de PV com preenchimento proporcional, estados estável, cheio e crítico derivados diretamente do Actor PF2e.
- Acentos de perfil preservados para Arkius, Charles, Atlas e Yu dentro da Mecânica Única.

### Alterado
- Cabeçalho recebe retrato circular mecânico, selo de nível, tubo de PV e bloco compacto de defesas inspirado no registro arcano de Concórdia.
- Personagem, Combate, Arsenal, Magia, Talentos, Mecânica Única e Efeitos recebem hierarquia, materiais e contraste próprios.
- Entradas de magia diferenciam foco, ritual e inata sem alterar os dados ou o fluxo de conjuração do PF2e.
- Diagnóstico GM passa a informar o tema `Mechanical Grimoire` e o modo de animação ativo.

### Corrigido
- Títulos e níveis deixam de perder contraste em Magia, Talentos e Efeitos.
- O preenchimento de PV usa transformação estável e não provoca deslocamento de layout durante atualizações.
- Regras de Concórdia permanecem isoladas da ficha Ethernum Company.

### Testes
- 442 testes automatizados, incluindo oito apresentações independentes de ficha, estados de PV, materiais, diagnóstico e isolamento entre temas.

## [3.7.4] - 2026-08-09

### Adicionado
- Identidade visual industrial exclusiva da Ethernum Company em aço, carvão, ouro envelhecido e ciano de Éter.
- Selo ampliado de nível, traço vital no painel de PV, ícones de atributos e marcadores visuais para recursos PF2e finitos.
- Serviço de movimento com preferência local `completo`, `reduzido` ou `desligado`, incluindo respeito a `prefers-reduced-motion`.
- Feedback visual transitório para rolagens, críticos, dano, cura, gasto e recuperação de recursos.

### Alterado
- Cabeçalho, navegação, Overview, Combate, Equipamento, Magia, Talentos, Éter, Runas, Mecânica Única e Efeitos recebem acabamento coerente com o dossiê operacional.
- Overview passa a priorizar três colunas em telas largas e reorganiza o painel lateral em duas ou uma coluna conforme o espaço disponível.
- Cartões de atributos acomodam nomes longos sem abreviação; recursos reservam largura estável para rótulo, valor e marcadores.
- Estados hover, foco, ativo, bloqueado, vazio e gasto ficam mais claros sem substituir ações do Foundry ou do PF2e.

### Corrigido
- Elementos decorativos deixam de participar da grade principal e não deslocam cabeçalho, abas ou conteúdo.
- Feedbacks que provocam rerender são restaurados no novo DOM sem gravar flags de apresentação no Actor.
- Marcadores de recursos com máximo alto deixam de comprimir ou sobrepor rótulos e valores.

### Testes
- 437 testes automatizados cobrindo regressões existentes e o contrato visual, semântico, responsivo e de movimento da Ethernum Company.

## [3.7.3] - 2026-08-09

### Adicionado
- Serviço de viewport que preserva aba, scroll, foco e seções recolhíveis durante rerenders e entre visitas às abas.
- Papéis de imagem com dimensionamento estável, modos `cover`/`contain` e fallbacks seguros por tipo de conteúdo.
- Prepared Data Service assíncrono para spellcasting e crafting, preservando as collections e APIs públicas do PF2e 7.8.
- Rich Text enriquecido pelas APIs PF2e/Foundry com remoção estrutural de blocos secretos para usuários sem permissão.
- Telemetria local em buffer limitado e painel de diagnóstico GM com capabilities, módulos, fallbacks, tempos de render e cópia sanitizada.
- Fixtures representativas de Fighter, Wizard, Sorcerer, Cleric, Kineticist, Inventor, Thaumaturge, Alchemist e Monk.
- Matriz de compatibilidade documentada em `docs/COMPATIBILITY.md`.

### Alterado
- Spellcasting e crafting priorizam dados preparados do PF2e antes do adapter e do fallback para a ficha oficial.
- Overview organiza Details, Activities, Crafting e Biography em seções recolhíveis persistidas apenas localmente.
- Compact Mode reduz padding, altura de linhas, thumbnails e metadados secundários preservando controles essenciais.
- Ranks, idiomas, sentidos, traits, tradições e unidades usam localização oficial quando disponível.
- CSS Concórdia passa a ser dividido por shell, header, navegação, overview, combate, arsenal, magia, mecânica única, efeitos e responsividade sem alterar a ordem visual.

### Corrigido
- Ações, recursos e atualizações de Actor deixam de devolver a ficha ao topo ou perder o foco equivalente após rerender.
- Imagens largas, altas, transparentes ou ausentes deixam de comprimir colunas, distorcer proporções ou exibir o ícone quebrado do navegador.
- Special Actions deixam de repetir ações já representadas em Combate.
- Erros técnicos ficam disponíveis apenas ao mestre; jogadores recebem mensagem curta e acesso seguro à ficha PF2e.
- Diagnóstico de drag and drop, Rich Text, crafting e módulos passa a refletir capabilities reais em vez de inferências otimistas.

### Testes
- 411 testes automatizados cobrindo paridade PF2e, viewport, foco, imagens, prepared data, Rich Text, localização, deduplicação, telemetria, diagnóstico e regressões das fichas existentes.

## [3.7.2] - 2026-08-09

### Adicionado
- Overhaul arcano-industrial da ficha Concórdia com navegação superior própria para Personagem, Combate, Arsenal, Talentos, Magia, Mecânica Única e Efeitos.
- Painéis somente leitura para biografia, proficiências de armas e armaduras, CDs de classe, sentidos, idiomas, exploração, downtime, crafting e ações especiais preparadas pelo PF2e.
- Recursos de Focus, classificação de conjuração preparada, espontânea, inata, focus e ritual, grupos por rank e fallback explícito para preparação avançada.
- Apresentação temática e não invasiva do chat para mensagens Ethernum Company e Concórdia, preservando os cards e rolagens do PF2e.
- Accents visuais discretos para Arkius, Charles, Atlas e Yu dentro da Mecânica Única de Concórdia.

### Alterado
- Cabeçalho de Concórdia recebe retrato ampliado e faixa compacta de CA, Percepção e salvamentos, mantendo PV e Pontos Heroicos no mesmo Actor PF2e.
- Inventário é apresentado como Arsenal sem duplicar itens, Bulk, investimento, recipientes ou estados de carga.
- Grupos de inventário e magia e a visibilidade de itens guardados passam a restaurar estado local da ficha sem gravar preferências no Actor.
- Diagnóstico de ficha passa a expor falhas isoladas, fallbacks utilizados e capabilities centralizadas do PF2e.

### Corrigido
- Falhas em Overview, Combate, Arsenal, Magia, Talentos, Mecânica Única ou Efeitos deixam de derrubar o restante da ficha e oferecem retorno seguro à ficha PF2e.
- A classe histórica usada pela Mecânica Única deixa de ocultar o painel embutido nas fichas novas; Arkius e Pipping voltam a exibir o conteúdo completo ao trocar de aba.
- Atualizações de itens de ação invalidam também os dados de exploração, downtime e ações especiais exibidos em Personagem.
- A ficha Ethernum Company mantém suas abas, sistemas de Éter, FE e Runas sem herdar módulos exclusivos de Concórdia.

### Testes
- Cobertura de paridade para detalhes preparados do PF2e, ficha Concórdia, isolamento de módulos, estado local, spellcasting, chat temático, fallbacks, capabilities e regressões dos perfis existentes.

## [3.7.1] - 2026-08-09

### Adicionado
- `PF2eCharacterBridge` com detecção centralizada de capabilities, operações preparadas e fallback explícito para a ficha PF2e.
- Snapshot 2.1 de magia com collections, ranks, slots, usos, estado preparado, gasto e assinatura quando fornecidos pelo PF2e.
- Leitura preparada de Bulk, imunidades, resistências e fraquezas, sem fabricar totais quando o PF2e não expõe o dado.
- Traduções completas em português e inglês para a interface alterada da ficha Ethernum Company.

### Alterado
- Estados `held`, `worn`, `stowed` e `dropped`, mãos ocupadas, investimento, recursos e condições passam pelas APIs públicas do PF2e.
- Conjuração e drop de magias delegam para `actor.spellcasting.collections`, incluindo rank e slot, sem consumo manual.
- Cache da ficha passa a invalidar módulos conforme dependências estruturadas de Actor, Item e flags Ethernum.
- O painel Ethernum reforça os terminais de combate, inventário, magia, Éter, Runas, Mecânica Única e efeitos sem duplicar o estado do Actor.

### Corrigido
- Textos longos de ancestralidade, herança, classe e antecedente não invadem mais a navegação.
- Abas de Combate, Equipamento, Magia, Talentos e demais áreas voltam a responder ao clique do mouse em modos normal e compacto.
- Comandos da ficha ficam em uma barra horizontal no topo, e a navegação permanece em uma faixa independente abaixo do cabeçalho.
- “Gerenciar preparação” agora abre o fluxo PF2e em vez de funcionar como placeholder.
- Rótulos internos como `PF2E.AbilityStr` deixam de aparecer na interface.

### Testes
- Cobertura de cache/lifecycle, Bulk, carry type, investment, resources, conditions, spell collections, slots preparados, fallback, i18n e sincronia sobre o mesmo Actor PF2e.

## [3.7.0.1] - 2026-08-09

### Adicionado
- Seletor direto de ficha na interface Ethernum e no cabeçalho da ficha PF2e original, com opções Automático, Ethernum Company, Concórdia e PF2e Original.

### Corrigido
- O registro da ficha Ethernum agora ocorre depois do registro do PF2e, preservando corretamente a escolha padrão quando o mundo não possui override explícito.
- As abas da ficha personalizada alternam o painel visível sem disputar renderizações e deixam de retornar ao conteúdo anterior.
- Os botões de navegação deixam de ocupar individualmente toda a largura da ficha.
- Rastreador de Combate e Central do Mestre permanecem acima do canvas, mas abaixo de fichas, diálogos e configurações do Foundry.
- O adaptador de movimento prioriza `system.movement` e os dados preparados, evitando o acesso obsoleto a `system.attributes.speed` no PF2e 7.8.
- Registro de fichas e herança da Application V1 usam os namespaces atuais do Foundry 13 quando disponíveis.
- O retrato da ficha usa a API atual de `ImagePopout`, sem os avisos de assinatura obsoleta do Foundry 13.

### Compatibilidade
- A troca grava somente o modo Ethernum e o identificador de ficha oficial do Foundry no ator; dados, flags e aliases de mecânicas existentes permanecem inalterados.

## [3.7.0] - 2026-08-08

### Adicionado
- Character Sheet Framework com um único controller, registry, estado local, event bus, cache curto, módulos isolados, diagnóstico GM e lifecycle compartilhado.
- Fichas próprias com shells Ethernum Company e Concórdia, seleção automática por `activeCore`, override por ator e retorno transitório à ficha PF2e original.
- `PF2eCharacterAdapter` 2.0 para identidade, vitais, atributos, perícias, defesas, movimento, Strikes, ações, inventário, talentos, magia, efeitos e recursos.
- Ações seguras que delegam rolagens, Strikes, dano e ações preparadas às APIs do PF2e.
- Templates e estilos responsivos próprios, incluindo Éter, FE, Runas, Mecânica Única, Momentum Fides e Fulgor Negro.
- Serviços públicos de estado, ação, descanso e apresentação de Mecânicas Únicas, sem imports do Kernel ou da facade Legacy no framework de fichas.

### Alterado
- Os sete perfis atuais passam a ser a fonte das 30 macros gerenciadas de personagem; `main.ts` mantém somente as duas macros universais de Fides e Fulgor.
- Schema avança para 14 e adiciona `characterSheetMode = auto` somente quando a flag está ausente.
- A política de mundo permite ao mestre decidir se owners podem escolher o shell personalizado.

### Compatibilidade
- Nomes, comandos, IDs, imagens, flags e aliases históricos das macros permanecem preservados.
- Grimório, hover, animações e listeners completos de Pipping são reutilizados dentro da ficha personalizada.
- A ficha PF2e original continua registrada como fallback e pode ser aberta sem alterar a configuração permanente do ator.

### Testes
- Cobertura de resolução de shell, estado local, event bus, isolamento de módulos, permissões, ações PF2e, arquitetura sem Kernel/Legacy, Adapter 2.0, migração e macros.

## [3.6.2] - 2026-08-08

### Adicionado
- Runtimes modulares para Arkius, Charles, Atlas, Yu, Bayle e Gyro, com arquivos próprios de estado, ações gerenciadas, dados de ficha e hooks conforme a necessidade de cada perfil.
- `PF2eCharacterAdapter` com snapshot estável para nível, classe, ancestralidade, herança, PV, CA, percepção, deslocamento, salvamentos, Pontos Heroicos e condições.
- Testes de arquitetura para impedir o retorno de `legacyProfileAdapter` aos seis perfis migrados e testes de equivalência entre dispatcher e wrappers públicos antigos.

### Alterado
- Arkius, Charles, Atlas, Yu, Bayle e Gyro passam diretamente de `UniqueMechanicProfile` para seus runtimes; Pipping mantém sua arquitetura modular existente.
- Dados de ficha dos perfis migrados expõem somente o ramo do personagem ativo, preservando o contrato atual dos templates.
- Estados e normalizadores dos seis personagens foram separados dos perfis para evitar dependências circulares e preparar as futuras fichas Ethernum e Concórdia.
- `UniqueMechanicsLegacy.ts` foi reduzido de 7.902 para 67 linhas e agora contém somente a fachada de compatibilidade; a implementação compartilhada restante foi isolada no núcleo interno.

### Corrigido
- Aliases históricos das ações de Bayle agora são convertidos para os identificadores canônicos antes da execução.
- A ação de Rede Sobrecarregada de Charles encaminha explicitamente o modo sobrecarregado pelo dispatcher.
- O núcleo de mecânicas não depende mais do registro externo de perfis, eliminando inicialização circular em diferentes ordens de carregamento.

### Compatibilidade
- APIs em `game.ethernum`, macros existentes, Authority Bridge, Approval Queue, Audit Log e políticas restritivas permanecem preservados.

## [3.6.1] - 2026-08-08

### Adicionado
- Controle do Mestre global e independente, montado uma única vez no cliente do GM com launcher, badge de autorizações e estados normal, pendente, aviso e erro.
- Drag e resize por Pointer Events, limites responsivos, restauração de posição e tamanho e persistência por mundo e usuário.
- API pública em `game.ethernum.ui` para abrir, fechar, alternar, minimizar, restaurar e atualizar o painel.
- Botão para abrir o Controle do Mestre diretamente pelo modo GM do Combat Momentum Tracker.
- Paginação do Audit Log em grupos de 50 registros, mantendo busca e filtros sobre todo o histórico.

### Alterado
- O Controle do Mestre deixa de ser uma aba da ficha PF2e e passa a existir como overlay exclusivo do GM no `document.body`.
- Atualizações do Authority Bridge passam a atualizar seletivamente o painel; quando minimizado, somente badge e estado compacto são recalculados.
- Temas Ethernum e Concórdia passam a incluir moldura, cabeçalho e launcher próprios do overlay.

### Corrigido
- Renderizações repetidas de fichas não criam mais instâncias adicionais do Control Center.
- Listas grandes de auditoria deixam de reconstruir centenas de linhas a cada atualização.
- Cleanup remove listeners, timers, subscriptions e o overlay ao encerrar o cliente.

## [3.6.0] - 2026-08-08

### Adicionado
- Mechanics Core 2.0 com dispatcher central, contratos expandidos por perfil e facade de compatibilidade para todas as APIs e macros existentes.
- Execuções independentes por `executionId` para Pipping, com reserva de recursos, estágios, resultado, cancelamento, falha e reconciliação de timeout.
- Authority Bridge 2.0 unificando mutações PF2e e operações de canvas com GM primário, revalidação, políticas, idempotência e proteção contra replay.
- Controle do Mestre exclusivo para GM com Resumo, Autorizações, Audit Log, Políticas, Diagnóstico e Administração nos temas Ethernum e Concórdia.
- Audit Log persistente e limitado, filtros estruturados, exportação JSON, fila com expiração e comandos de aprovação, rejeição e confiança por perfil.
- Testes de replay, aprovação, rejeição, expiração, dispatcher dos sete perfis, execuções simultâneas e animações persistentes.

### Alterado
- Gyro, Bayle, Pipping, Arkius, Yu, Charles e Atlas passam pelo dispatcher sem remover wrappers ou aliases antigos.
- Schema de mundo avança para 13 e o estado de Pipping para a versão 5, preservando flags desconhecidas e cancelando reservas antigas órfãs.
- `UniqueMechanics.ts` passa a ser uma facade curta; o motor anterior permanece isolado como camada de compatibilidade.

### Corrigido
- Pipping pode iniciar uma segunda ação enquanto outra aguarda alvo, diálogo, posicionamento ou aprovação do mestre.
- Cancelamentos, recusas, falhas e timeouts de Pipping liberam apenas a reserva da execução correspondente e não travam a ficha.
- A fumaça persistente de Pipping acompanha o token e é renderizada abaixo dele em Sequencer, PIXI e fallback DOM.
- Ações protegidas executadas por jogadores usam o mesmo canal de autoridade para efeitos, condições, dano, cura e canvas.

### Segurança
- Pedidos remotos validam novamente usuário, ownership, ator, perfil, ação, payload, alvos, cena, token e limites imediatamente antes da execução.
- Requests repetidos retornam o resultado já processado ou são registrados como duplicados sem executar a operação novamente.

## [3.5.5] - 2026-08-08

### Adicionado
- Ponte de autoridade validada para jogadores aplicarem dano, cura, condições e efeitos das mecânicas de Gyro, Yu, Charles, Atlas e Arkius em atores que não controlam diretamente.
- Ponte de autoridade de canvas para Aura Cinética, Rede de Amortecimento e Exaurir o Sol, preservando a autoria do template para o jogador que solicitou a ação.
- Controle na aba do mestre para conceder uma carga de Fulgor Negro ao personagem durante o combate, sem alvo pré-definido e com o limite normal da habilidade-chave.
- Testes de regressão para políticas de permissão, limites de mutação, operações de canvas, Aura Cinética sem Thermal Nimbus e concessão manual de Fulgor.

### Corrigido
- A Aura Cinética de Arkius Jacker acompanha o token mesmo quando Thermal Nimbus está desativado e usa as coordenadas novas do documento no mesmo movimento.
- Ações de jogadores deixam de falhar ao criar templates protegidos ou aplicar efeitos em aliados e inimigos que pertencem ao mestre ou a outros usuários.
- IDs de template armazenados em flags só podem localizar documentos com o tipo e o personagem de origem correspondentes.

### Segurança
- Solicitações remotas validam propriedade do personagem, perfil ativo, habilidade, quantidade de alvos, limites de PV, condições, regras PF2e, cena e token de origem antes da execução pelo mestre principal.

## [3.5.4] - 2026-08-07

### Adicionado
- Grimório da Noite com cabeçalho, resumo mecânico dinâmico, detalhes estruturados, graus de sucesso, scaling completo, requisitos, duração e automação por componente para todas as habilidades de Pipping.
- Geometria compartilhada para cones, emanações e explosões, incluindo tokens parcialmente dentro da área, cenas sem grade e origem na Sombra Animada ou em ponto escolhido.
- Hover visual distinto para Destruição, Ordem, Caos e habilidades universais, com foco por teclado, movimento reduzido e prévia local opcional no token.
- Diagnóstico de animações para mestres em `game.ethernum.macros.ethernumCompany.pipping.animationDiagnostics()`, com verificação em cache de Sequencer, JB2A e fallbacks.

### Alterado
- Ficha e runtime de Pipping passam a resolver alvos, alcance e área a partir dos mesmos descritores declarativos.
- Cards de execução no chat exibem custo total, fórmula, CD, alcance ou área, alvos, duração e componentes assistidos.
- Sussurro das Trevas documenta e automatiza uso normal ou intensificado, consumo no primeiro teste e expiração no próximo turno de Pipping.

### Corrigido
- Coro do Fim seleciona somente criaturas no cone confirmado de 30 pés.
- Sombra-Rei usa a posição da Sombra Animada como centro da área.
- Epitáfio do Sol Morto permite escolher o ponto da explosão e cria a escuridão persistente no mesmo local.

## [3.5.3] - 2026-07-29

### Adicionado
- Posicionamento interativo e confirmado para Sombra Animada e Sombras Espelhadas, com prévia no canvas, encaixe na grade, alcance por Tier e nova validação pelo mestre.
- Fonte declarativa de fórmulas e scaling para as ações de Pipping, exibindo valor atual, próximo aumento, máximo e nível correspondente na ficha.
- Áreas persistentes visíveis para Sombra-Rei e Epitáfio do Sol Morto, estado próprio da Sombra Animada e reconciliação segura dos documentos do canvas.
- Serviço de animações próprio para todas as ações de Pipping, com modos completo, reduzido e desativado, velocidades configuráveis e fallbacks Sequencer, JB2A, PIXI e DOM.
- Adaptador de salvamentos PF2e com fallback identificado, além de testes para scaling, animações, posicionamento, migração e âncoras de token.

### Alterado
- Descritores das habilidades de Pipping passam a concentrar alcance, área, alvos, salvamento, efeitos, fórmulas e nível de automação.
- Dano tipado usa a aplicação do PF2e quando disponível e permanece assistido quando a API não for segura; cura respeita os PV máximos.
- Sussurro das Trevas permite uso normal ou intensificado, Liturgia permite a escolha da condição reduzida e Manto da Ordem Negra deixa de conceder resistência genérica.
- Schema de mundo avança para 12 e o estado interno de Pipping para a versão 4, preservando flags, escolhas, recursos, manifestações e campos desconhecidos.

### Corrigido
- As auras constantes de Pipping e Arkius Jacker passam a usar a posição autoritativa do documento de token durante `updateToken`, eliminando o atraso de uma movimentação.
- Pulso Sombrio acima de um máximo recalculado não é reduzido silenciosamente durante atualizações comuns.
- Epitáfio do Sol Morto e Toque do Vazio registram dano persistente compatível com as condições do PF2e.

## [3.5.2] - 2026-07-29

### Adicionado
- Executor operacional das habilidades de Pipping com seleção de alvos, salvamentos PF2e, dano, cura, condições temporárias, efeitos e confirmação assistida para movimentos narrativos.
- Três manifestações visuais transparentes de Destruição, Ordem e Caos, com sorteio uniforme ao criar Sombra Animada e Sombras Espelhadas no canvas.
- `MeasuredTemplate` persistente para a Canção da Noite Viva, sincronizado com o token e reconciliado ao carregar a cena.
- Abas recolhíveis por Tier, identidade visual por Expressão e cards de resultado legíveis no chat.
- Ponte de autoridade por socket para jogadores solicitarem ao mestre primário alterações protegidas de atores e documentos do canvas.
- Workflow de CI com typecheck, testes, build e validação de manifesto/distribuição; releases também passam a exigir a suíte verde.

### Alterado
- Schema de mundo avança para 11 e o estado interno de Pipping recebe migração segura para a versão 3, preservando campos desconhecidos, recursos e escolhas existentes.
- Pulso e usos diários são confirmados somente depois da execução; cancelamentos e falhas de autoridade não gastam recursos.
- Temporizador respeita a duração preferida apenas em combates novos e reassume a contagem após troca do mestre primário.

### Corrigido
- Habilidades de Pipping deixam de publicar apenas placeholders e passam a produzir resultados mecânicos rastreáveis.
- Ticker do relógio é interrompido quando a contagem não está rodando; arraste do tracker ignora controles e limpa eventos cancelados.
- Hooks assíncronos de ficha, combate, ator e token passam a registrar falhas sem gerar rejeições não tratadas.

## [3.5.1] - 2026-07-29

### Alterado
- Temporizador passa a ocupar uma faixa de maior destaque dentro do cabeçalho do rastreador, preservando o título completo em painéis estreitos.
- Aba Jogador exibe somente a contagem do temporizador; estado, combatente atual, duração e ações administrativas ficam exclusivos da aba Mestre.
- Controles do temporizador do mestre foram reorganizados em grupos estáveis de duração e ações.

### Corrigido
- Campos de duração, unidade e botões do temporizador deixam de se sobrepor em rastreadores com 390 pixels de largura.

## [3.5.0] - 2026-07-29

### Adicionado
- Progressão modular completa de Pipping Baldwin Black em cinco Tiers, com escolhas de Destruição, Ordem ou Caos, Pulso Sombrio escalável, habilidades futuras bloqueadas e CD da Noite baseada na ficha.
- Ações assistidas de Pipping, Sustento automático da Canção da Noite Viva, Ecos do Vazio limitado a uma vez por rodada, Comungar com a Noite, preparações diárias e finalizadores de uso diário.
- Resolução assistida da escuridão de Pipping nos modos manual, aleatório, dispersão e área, mantendo a identidade dos alvos visível somente ao mestre.
- Temporizador global de turnos persistido no combate, configurável em segundos ou minutos, com pausa, continuação, reset, avanço manual e avanço automático protegido contra duplicação.
- Animações locais de Momentum Fides e Fulgor Negro com modos completo, reduzido e desativado, suporte opcional a Sequencer/JB2A e fallback em CSS.
- Configurações de cliente para visibilidade do rastreador, uso somente durante combate, estatísticas detalhadas, animações e restauração de posição.
- Registro central de perfis, serviços de autoridade de automação, macros gerenciadas e animações, além de módulos próprios de estado para todos os personagens existentes.
- Suíte Vitest cobrindo autoridade, macros gerenciadas, timer, migrações, progressão e escuridão de Pipping, Momentum Fides e Fulgor Negro.

### Alterado
- Macros gerenciadas passam a priorizar flags do módulo, respeitar `userModified` e não sobrescrever macros pessoais que compartilhem o mesmo nome.
- Inicialização e migração de atores passam a usar processamento individual com relatório de falhas; o schema global não avança quando algum ator não puder ser validado.
- Rastreador filtra atualizações irrelevantes do ator e atualiza a contagem visual do timer sem escrever flags a cada segundo.
- Estados padrão e normalizadores de Gyro, Bayle, Pipping, Arkius, Yu, Charles e Atlas foram extraídos para perfis próprios sem alterar IDs, flags ou aliases públicos.
- Migração de mundo avança para schema 10 e converte somente estados existentes de Pipping para a versão interna 2, preservando perfil, núcleo, recursos e campos desconhecidos.

### Corrigido
- Inserções de valores customizados na interface deixam de interpolar HTML diretamente.
- Escolha da autoridade principal fica consistente entre automações de chat, descanso, inicialização, tracker e temporizador.
- Atualizações automáticas do temporizador não avançam duas vezes, preservam a pausa em mudanças manuais de turno e encerram seus agendamentos ao apagar o combate.

## [3.4.10] - 2026-07-28

### Adicionado
- Rastreador global de combate fora das fichas, com visão do jogador e uma visão de mesa exclusiva do mestre.
- Registro automático de falhas, falhas críticas, sucessos, sucessos críticos e resultados naturais 1 e 20 por personagem durante o combate.
- Momentum Fides com três marcas consecutivas, três cargas diárias, consumo automático no próximo ataque e suporte a Strike sem MAP pelo macro gerenciado.
- Fulgor Negro com gatilho por 20 natural, mesmo alvo, MAP preservada, faixa natural de 17 a 20 e limite pelo modificador da habilidade-chave.
- Macros gerenciados `Ethernum - Momentum Fides` e `Ethernum - Fulgor Negro`, com aliases públicos em `game.ethernum.macros.combat`.
- Controles do mestre para corrigir marcas, encerrar Fulgor, limpar um combate e aplicar preparações diárias por personagem ou em toda a mesa.

### Alterado
- Preparações diárias do PF2e e o descanso longo do Ethernum restauram as três cargas de Fides e limpam estados transitórios de combate.
- Processamento de ataques do rastreador usa uma fila por ator para preservar a ordem de atividades com múltiplas rolagens.
- Migração de mundo avança para schema 9 e cria a flag `combatMomentum` sem alterar mecânicas ou dados de personagens existentes.

### Corrigido
- Fulgor Negro encerra automaticamente ao mudar o turno, trocar de alvo, falhar, obter 16 natural ou menos, alcançar o limite ou derrotar o alvo.
- Um acerto interrompe corretamente a sequência de falhas de Momentum Fides e o fim do combate remove marcas e cadeias pendentes.

## [3.4.9] - 2026-07-25

### Adicionado
- Perfil funcional de Charles com Miranha em Ação, três cargas, Escalada de Impulso, Disparo de Contenção, Puxão Vetorial, Rede de Amortecimento, Craft da Imaginação e falha do dispositivo sem cargas.
- Perfil funcional de Atlas Sidarta com Olhar do Divino, seis modificações de magia, Fusão de Guerra, penalidades agendadas e Esgotamento Total.
- Macros gerenciados e painéis temáticos próprios para Charles e Atlas, com paletas de forja e guerra divina.
- Automação de templates, salvamentos, condições PF2e e gatilhos de movimento/turno para a Rede de Amortecimento sobrecarregada.

### Alterado
- Perfis de Charles e Atlas deixam de ser placeholders de Concórdia e passam a preservar estado próprio nas flags do ator.
- Migração de mundo avança para schema 8 e adiciona os estados novos sem sobrescrever dados existentes.
- Olhar do Divino consome automaticamente a preparação após o próximo roll de dano ou cura de magia e mantém o alias em português junto ao nome técnico da API.

### Corrigido
- Atualizações repetidas do mesmo turno não duplicam a expiração de condições nem reaplicam Lento/Estupefato de Atlas.
- Batismo de Ferro não converte magias puramente de fogo, eletricidade ou sônico.
- A penalidade curta do Esgotamento Total é separada do bloqueio de Olhar do Divino até o descanso longo.

## [3.4.8] - 2026-07-25

### Adicionado
- Validador de manifesto, referências, imports locais do bundle e conteúdo do ZIP de release.
- Logs de diagnóstico para mensagens sem ID, reprocessamento idempotente e falhas assíncronas da automação PF2e.
- Macro gerenciado de Flurry of Blows do Yu, com escolha do Strike desarmado e MAP inicial, dois ataques, danos e salvamentos automáticos.

### Alterado
- Pipeline de release agora exige `typecheck`, versões coerentes e distribuição válida antes de publicar.
- Configurações de restauração no descanso, exibição de custo de Éter e permissão de Override passam a controlar seus respectivos fluxos.
- README e ficha passam a refletir as classes de runa, fórmula de talentos, visibilidade das abas e compatibilidade declarada atuais.
- Stunning Fist e Sobrecarga de Medo do Yu passam a ser resolvidos dentro do fluxo automático de Flurry of Blows, preservando os macros antigos como aliases compatíveis.

### Corrigido
- Automações de ataques são processadas por um único GM ativo e no máximo uma vez por mensagem.
- Atualizações de recursos de Gyro, Bayle, Pipping, Arkius e Yu deixam de trocar o núcleo ou perfil selecionado na ficha.
- Rage in the Flesh registra imunidade a Frightened na ficha PF2e e aplica os bônus de dano a todos os Strikes desarmados, incluindo os fornecidos por stances de monge.
- Cards e textos do Yu usam contraste claro sobre o fundo escuro no chat e na aba de mecânica única.

## [3.4.7] - 2026-07-14

### Corrigido
- Seleção da mecânica única de Yu, Jiu Ji Tae agora permanece ativa na aba de Concórdia em vez de voltar para "Sem mecânica única".

## [3.4.6] - 2026-07-14

### Adicionado
- Perfil funcional de Concórdia para Yu, Jiu Ji Tae com a mecânica Rage in the Flesh.
- Aba temática do Yu com postura, rodadas, gatilho de emergência, Flurry of Blows, Stunning Fist, colapso e espaço de macros.
- Macros gerenciados de Yu para painel, ativar postura, Sobrecarga de Medo e dano extra de Stunning Fist.
- Gatilho de emergência do Yu tenta ativar a postura automaticamente ao cair para 30% dos PV máximos ou menos.

### Alterado
- Thermal Nimbus usa chave de turno do encontro atualizado para causar dano novamente quando o inimigo ainda inicia o turno dentro da aura.
- Thermal Nimbus separa dano base, fraqueza da Aura Junction e fraquezas próprias do alvo.
- Fraquezas de Arkius agora usam o maior valor encontrado por tipo relevante em vez de somar duplicatas internas do PF2e.

### Corrigido
- Dano de Junction da Thermal Nimbus passa a ser tratado como fraqueza da aura, não como outro pacote de dano base.
- Migração de schema adiciona estado persistente de Yu a atores antigos.

## [3.4.5] - 2026-07-13

### Adicionado
- Botão e macro gerenciado de Thermal Nimbus para Arkius Jacker, integrados à Aura Cinética.
- Thermal Nimbus tenta aplicar dano automático em inimigos que entram na aura ou iniciam o turno nela, ignorando aliados.
- Gate Junction de Fogo pode ser alternada na aba para somar o dano extra da aura.

### Alterado
- Cards de chat de Arkius/Concórdia usam paleta preta, vermelha e laranja em vez do padrão verde do Gyro.
- Cards de chat de Bayle e Pipping passam a ter estilos baseados no tema de cada personagem.
- Fraquezas exibidas/aplicadas para Arkius agora são filtradas para Fogo, Metal e Área; Thermal Nimbus consulta apenas fraqueza de Fogo.

### Corrigido
- O alias `clearThermalNimbusAura` agora limpa a aura em vez de alterná-la acidentalmente.
- Cliques na aba de Mecânica Única deixam de animar o scroll do topo até a posição anterior.
- Migração de schema adiciona estado persistente de Thermal Nimbus a atores antigos.

## [3.4.4] - 2026-07-13

### Adicionado
- Macro gerenciado de Aura Cinética para Arkius Jacker, com efeito narrativo e template circular independente do Núcleo em Brasas.
- Ressonâncias visuais de Concórdia abaixo de Exaurir o Sol: Correntes Douradas, Escamas Rubras e Convergência.
- Sistema de Runas agora possui seletor de personagem e painel visual preparado para runas de Concórdia/Arkius Jacker.
- Controle de turno do encontro atualiza rodadas do Núcleo em Brasas e limpa a penalidade pendente de Brasas no início do turno de Arkius.

### Alterado
- Sintonia de Brasas agora rola a fórmula corrigida completa: todos os dados sobem um passo e o primeiro grupo ganha +1 dado.
- Exaurir o Sol agora cria o template primeiro e espera o ajuste manual no canvas antes de detectar alvos e aplicar salvamentos.

### Corrigido
- Núcleo em Brasas passa a tentar aplicar fraqueza 5 a Gelo e Eletricidade como Rule Elements PF2e.
- Exaurir o Sol soma fraquezas detectadas de Fogo, Área e Gate Junction ao dano aplicado automaticamente.
- Tema de Arkius/Concórdia foi reforçado nas abas de mecânicas únicas e runas para remover herança visual esverdeada.

## [3.4.3] - 2026-07-13

### Adicionado
- Sintonia de Fluxo e Sintonia de Brasas agora possuem estado pendente, botões de consumo e cards próprios.
- Exaurir o Sol agora usa seleção persistente de área, cria template correspondente, detecta tokens na área e confirma alvos antes de aplicar Reflexos básico e dano.
- Exaurir o Sol recebeu card de chat premium e tentativa cinematográfica via Sequencer/JB2A com fallback silencioso.

### Corrigido
- Tema visual de Arkius Jacker sobrescreve a herança verde genérica da aba de mecânicas únicas.
- Migração de schema completa os novos campos de Arkius em atores já existentes.

## [3.4.2] - 2026-07-06

### Corrigido
- O painel principal de Arkius Jacker agora renderiza o frame visual de Concórdia como imagem de fundo real, em vez de depender apenas de variável CSS.
- Layout responsivo do frame de Arkius passa a escolher entre os assets largo, vertical e equilibrado conforme a proporção da ficha.

## [3.4.1] - 2026-07-06

### Adicionado
- Placeholders de Concórdia para Atlas Sidarta, Charles, Morgana, Yu/Jiu Ji Tae e Unluck.
- Ícone dedicado do Arkius Jacker para efeitos e macros gerenciados.

### Corrigido
- Efeitos de Núcleo em Brasas e penalidades de Arkius não usam mais frames da UI como ícone.
- Paleta visual de Arkius ajustada para preto/vermelho com laranja de brasa.

## [3.4.0] - 2026-07-06

### Adicionado
- Implementação funcional do núcleo Concórdia RPG.
- Mecânica única de Arkius Jacker: Force a Marca - Núcleo em Brasas.
- Finalizador Exaurir o Sol com dano, CD e área por nível.
- Artefato Braço Evolutivo com Resiliência Reativa.
- Macros gerenciados de Arkius Jacker.
- Estado persistente para mecânicas de Concórdia.

### Alterado
- O módulo agora suporta, de forma funcional, personagens de múltiplas campanhas.
- `arkius-jacker` deixa de ser placeholder e passa a possuir UI e callbacks próprios.
- Migração de schema para preparar atores antigos com estado padrão de Concórdia.

## [3.3.14] - 2026-07-05

### Adicionado
- Núcleos de campanha separados: Ethernum Company RPG e Concórdia RPG.
- Seletor visual de núcleo nas abas Mecânicas Únicas e Sistema de Runas.
- Perfil placeholder `arkius-jacker` dentro do núcleo Concórdia.
- Namespaces novos de macro: `game.ethernum.macros.ethernumCompany.*` e `game.ethernum.macros.concordia.arkius.*`.

### Alterado
- Perfis de mecânica única agora são filtrados pelo núcleo ativo.
- Runas passam a ser separadas por núcleo; runas antigas sem núcleo continuam como Ethernum Company.
- Aliases antigos de macro continuam funcionando por compatibilidade.

## [3.3.13] - 2026-07-05

### Alterado
- O tracker automático agora força atualização visual das fichas abertas após ganhos de SP, Ardor ou Pulso.
- O parser de mensagens PF2e ficou mais estrito e ignora rolagens de dano, reagindo apenas a rolagens de ataque.

### Adicionado
- Marca da Proporção agora cria um efeito PF2e no Gyro com +2 de circunstância no próximo Strike e limpa esse efeito após a rolagem de ataque.

## [3.3.12] - 2026-07-05

### Adicionado
- Separação das ações do Gyro em categorias de Técnicas, IKONs, Ball Breaker e Rotação Absoluta.
- Popups de alvo e efeitos diretos para Rotação Medicinal, Ricochete Espiral, Marca da Proporção e técnicas de salvamento do Gyro.
- Tracker automático de acertos para SP do Gyro, Ardor do Bayle e Pulso Sombrio do Pipping.
- Perfis placeholder para Kaitake, Cinério e Ailan.

### Alterado
- Melhorou as descrições narrativas e técnicas das habilidades únicas.
- Bayle agora mostra ganhos de Despertar, colapsos e espaço de macro mais explícito.
- Pipping recebeu textos técnicos mais completos e macro para ajuste de Pulso.

### Corrigido
- Desvio da Rotação do Gyro não aparece mais como ativo fora do combate que o gerou.
- A animação de detalhes agora mira apenas o corpo direto do acordeão aberto.

## [2.0.0] - 2026-01-31

### Adicionado
- **Sistema de Descanso Longo**: Éter agora é restaurado apenas com descanso longo (substitui sistema de regeneração)
- **Sistema de 5 Classes de Runa**:
  - Classe 1 - Ancoragem: Defesa pessoal, buffs, dano ao toque (custo zero/mínimo)
  - Classe 2 - Projeção: Ataques à distância, utilitário de curto alcance (custo baixo)
  - Classe 3 - Manifestação: AoE, controle de multidão, alteração de terreno (custo médio)
  - Classe 4 - Disrupção: Efeitos permanentes, invulnerabilidade, criação de matéria (custo alto)
  - Classe 5 - Horizonte de Eventos: Reescrever realidade (custo catastrófico)
- **Sistema de Override**: Permite usar runas de classe superior com consequências
  - Teste de resistência (Constituição) contra DC baseada na classe
  - Sucesso: braço inutilizável + exaustão nível 3
  - Falha: colapso do patrocínio (dano massivo ou mutação)
- **Sistema de Ranks**: Progressão F → E → D → C → B → A → S → K
- **Sistema de Atributos de Éter**: FOR, DES, CON, INT, SAB, CAR separados com valores 1-10
- **Sistema de Talentos**: 15 talentos com rolagem integrada
  - Investigação, Percepção, Furtividade, Atletismo, Acrobacia
  - Intimidação, Persuasão, Enganação, Medicina, Sobrevivência
  - Arcanismo, Religião, Natureza, Sociedade, Ocultismo
- **Fórmula de Rolagem**: 1d20 + Talento + Rank + Atributo + Rank
- **Controles de GM**:
  - Definir classe máxima de runa permitida por personagem
  - Ativar/desativar runas específicas
- **Runas Customizáveis**: Nome, tipo de custo (sangue, éter, vida), valor de custo, efeito
- **Nova Aba de Atributos de Éter**: Separada da aba de runas
- **Nova Aba de Sistema de Runas**: Com informações das classes e controles de GM

### Alterado
- Interface dividida em duas abas separadas (Atributos e Runas)
- Sistema de éter agora usa atributos de éter próprios em vez dos atributos PF2E
- Remoção do sistema de regeneração passiva de éter
- Cálculo de éter máximo agora baseado em atributos de éter + ranks
- Cálculo de poder de éter agora inclui bônus da classe máxima de runa liberada

### Removido
- Sistema de regeneração de éter (substituído por descanso longo)
- Tipos de runa antigos (ofensiva, defensiva, suporte, utilidade) - agora usa classes 1-5

### Técnico
- Novos templates Handlebars: ether-attributes-tab.html, ether-runes-tab.html
- Novos helpers Handlebars: ethernum-gt, ethernum-lte, ethernum-rankIndex
- Constantes para ranks e classes de runa no namespace ETHERNUM
- Sistema de flags expandido para atributos, talentos e classe máxima de runa
- CSS expandido para suportar nova interface

## [1.0.0] - 2026-01-31

### Adicionado
- **Sistema de Éter (S.E)**: Sistema completo de atributos separado que funciona em conjunto com Pathfinder 2E
  - Cálculo automático de Éter Máximo baseado em Inteligência, Sabedoria e Nível
  - Sistema de Regeneração de Éter baseado em Sabedoria e Constituição
  - Poder de Éter que afeta rolagens, baseado em Inteligência e Carisma
  - Barra visual de éter com ajuste manual
  - Botão de recálculo de atributos
  - Botão de descanso para restaurar éter

- **Sistema de Runas**: Sistema completo de equipamento mágico
  - Criação de runas personalizadas
  - Quatro tipos de runas: Ofensiva, Defensiva, Suporte e Utilidade
  - Sistema de custo de éter por runa
  - Sistema de poder configurável (dados de dano)
  - Equipamento de runas (on/off)
  - Ativação de runas com consumo automático de éter
  - Verificação automática de éter suficiente
  - Descrições detalhadas para cada runa

- **Calculadora de Dados**: Integração completa com sistema PF2E
  - Rolagens aprimoradas com bônus de éter
  - Rolagens específicas para runas
  - Mensagens de chat formatadas
  - Integração com o sistema de rolagem do Foundry VTT

- **Interface de Usuário**:
  - Nova aba "Sistema de Éter" nas fichas de personagem PF2E
  - Design responsivo e moderno
  - Tema compatível com o Pathfinder 2E
  - Animações visuais (pulso em runas equipadas)
  - Cores temáticas em roxo/violeta para o sistema de éter
  - Ícones intuitivos da Font Awesome

- **Localização**:
  - Suporte completo para Português (Brasil)
  - Suporte completo para Inglês
  - Sistema de localização extensível

- **Configurações**:
  - Regeneração de éter ao descansar (configurável)
  - Mostrar informações de éter no chat (configurável)

- **Documentação**:
  - README completo em português
  - Instruções de instalação
  - Guia de uso detalhado
  - Exemplos de funcionalidades
  - Licença MIT

### Técnico
- Compatibilidade com Foundry VTT versões 11-13
- Integração específica com o sistema Pathfinder 2E
- Uso de Hooks do Foundry VTT para extensão do sistema
- Sistema de flags para armazenamento de dados do personagem
- Templates Handlebars para renderização dinâmica
- Helpers personalizados do Handlebars
- CSS moderno com variáveis CSS do Foundry
- Estrutura modular e extensível
- Classes JavaScript para organização do código

[2.0.0]: https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v2.0.0
[1.0.0]: https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v1.0.0
