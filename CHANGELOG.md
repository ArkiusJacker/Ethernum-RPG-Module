# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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
