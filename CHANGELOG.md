# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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

[1.0.0]: https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v1.0.0
