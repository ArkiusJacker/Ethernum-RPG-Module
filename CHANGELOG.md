# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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
