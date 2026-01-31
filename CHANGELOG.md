# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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
