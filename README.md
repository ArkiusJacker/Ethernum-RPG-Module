# Ethernum RPG Module - Sistema de Éter

[![Foundry VTT](https://img.shields.io/badge/Foundry-v11%20--%20v13-orange)](https://foundryvtt.com)
[![Pathfinder 2E](https://img.shields.io/badge/System-Pathfinder%202E-blue)](https://foundryvtt.com/packages/pf2e/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Sistema de RPG com múltiplas funções para funcionar no Foundry VTT (versões 11-13), criado especificamente para integrar com o sistema Pathfinder 2E. O módulo adiciona o Sistema de Éter (S.E), uma calculadora de dados aprimorada, e um sistema de runas personalizável.

## 🌟 Características

### 📊 Sistema de Éter (S.E)
- **Atributos Separados**: Sistema de atributos independente que funciona em conjunto com a ficha base do Pathfinder 2E
- **Cálculo Automático**: O éter máximo é calculado automaticamente com base nos atributos do personagem (Inteligência, Sabedoria e Nível)
- **Regeneração de Éter**: Sistema de regeneração baseado em Sabedoria e Constituição
- **Poder de Éter**: Bônus calculado a partir de Inteligência e Carisma que afeta as rolagens

### 🎲 Calculadora de Dados
- **Integração PF2E + S.E**: Combina os dados do Pathfinder 2E com o sistema de éter para criar rolagens aprimoradas
- **Bônus de Éter**: Adiciona automaticamente o poder de éter às rolagens compatíveis
- **Mensagens no Chat**: Exibe rolagens aprimoradas com informações detalhadas no chat

### 💎 Sistema de Runas
- **Equipamento Personalizável**: Nova categoria de equipamento chamada "Runas"
- **Tipos de Runas**: Ofensiva, Defensiva, Suporte e Utilidade
- **Custo de Éter**: Cada runa consome éter ao ser ativada
- **Poder Configurável**: Defina o poder de cada runa (dados rolados)
- **Sistema de Recompensas**: Gerencie custos e benefícios das runas

## 📥 Instalação

### Instalação Manual
1. Baixe a última versão do módulo
2. Extraia os arquivos para a pasta `Data/modules/ethernum-rpg-module` do Foundry VTT
3. Reinicie o Foundry VTT
4. Ative o módulo nas configurações do mundo

### Instalação via Manifest
1. No Foundry VTT, vá para "Add-on Modules"
2. Clique em "Install Module"
3. Cole o URL do manifest: `https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/latest/download/module.json`
4. Clique em "Install"

## 🎮 Como Usar

### 1. Ativando a Nova Aba
Após ativar o módulo, abra a ficha de um personagem. Você verá uma nova aba chamada "Sistema de Éter" (ícone de varinha mágica).

### 2. Gerenciando Éter
- **Éter Atual**: Ajuste manualmente ou use o botão "Descansar" para restaurar ao máximo
- **Recalcular**: Clique para recalcular os atributos de éter baseados nos atributos atuais do personagem
- **Regeneração**: Valor calculado automaticamente que indica quanto de éter regenera por descanso

### 3. Criando Runas
1. Clique em "Adicionar Runa" na seção de Runas
2. Nomeie sua runa
3. Escolha o tipo (Ofensiva, Defensiva, Suporte, Utilidade)
4. Defina o custo de éter e o poder
5. Adicione uma descrição detalhada dos efeitos

### 4. Usando Runas
1. Equipe uma runa clicando no ícone de círculo
2. Clique no ícone de dado (d20) para ativar a runa
3. O sistema automaticamente:
   - Verifica se há éter suficiente
   - Consome o éter necessário
   - Rola os dados de dano/efeito
   - Exibe o resultado no chat

## ⚙️ Configurações

O módulo oferece as seguintes configurações (acessíveis nas configurações do módulo):

- **Regeneração de Éter ao Descansar**: Se ativado, o éter será totalmente restaurado quando o personagem descansar (padrão: ativado)
- **Mostrar Éter no Chat**: Se ativado, mostra informações de éter nas mensagens de rolagem no chat (padrão: ativado)

## 🔧 Requisitos

- **Foundry VTT**: Versão 11 ou superior (testado até v13)
- **Sistema**: Pathfinder 2E (pf2e)

## 🌍 Idiomas Suportados

- Português (Brasil) - pt-BR
- English - en

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests
- Melhorar a documentação

## 📝 Licença

Este módulo é licenciado sob a Licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👤 Autor

**ArkiusJacker**

## 🙏 Agradecimentos

- Comunidade Foundry VTT
- Desenvolvedores do sistema Pathfinder 2E
- Todos os contribuidores e testadores

## 📞 Suporte

Para reportar problemas ou sugerir melhorias, abra uma [issue no GitHub](https://github.com/ArkiusJacker/Ethernum-RPG-Module/issues).
