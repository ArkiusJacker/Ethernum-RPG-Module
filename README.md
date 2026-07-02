# Ethernum RPG Module - Sistema de Éter

[![Foundry VTT](https://img.shields.io/badge/Foundry-v11%20--%20v13-orange)](https://foundryvtt.com)
[![Pathfinder 2E](https://img.shields.io/badge/System-Pathfinder%202E-blue)](https://foundryvtt.com/packages/pf2e/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Sistema de RPG com múltiplas funções para funcionar no Foundry VTT (versões 11-13), criado especificamente para integrar com o sistema Pathfinder 2E. O módulo adiciona o Sistema de Éter (S.E), uma calculadora de dados com sistema de talentos e ranks, e um sistema de runas personalizável com 5 classes de poder.

## 🌟 Características Principais

### 📊 Sistema de Éter (S.E) - Descanso Longo
- **Restauração por Descanso Longo**: O éter é restaurado apenas através de descanso longo (não há regeneração passiva)
- **Atributos de Éter Separados**: Sistema de atributos independente com Força, Destreza, Constituição, Inteligência, Sabedoria e Carisma
- **Sistema de Ranks**: Progressão F → E → D → C → B → A → S → K
- **Sistema de Pontos**: Valores de 1 a 10 para cada atributo
- **Cálculo Automático**: O éter máximo e poder de éter são calculados automaticamente

### 🎲 Calculadora de Dados com Talentos
- **Fórmula de Rolagem**: `1d20 + Talento + Rank do Talento + Atributo + Rank do Atributo`
- **15 Talentos**: Investigação, Percepção, Furtividade, Atletismo, Acrobacia, Intimidação, Persuasão, Enganação, Medicina, Sobrevivência, Arcanismo, Religião, Natureza, Sociedade, Ocultismo
- **Rolagem Rápida**: Botão de dado em cada talento para rolagem imediata

### 💎 Sistema de Runas com 5 Classes

#### Classe 1: Ancoragem (Estabilidade)
- **Foco**: Defesa Pessoal, Buff de Atributo, Dano ao Toque
- **Custo**: Zero ou Mínimo (Passivo do Patrocínio)
- **Visual**: Tatuagens/runas brilham levemente na pele

#### Classe 2: Projeção (Direcional)
- **Foco**: Ataques à Distância (Alvo Único), Utilitário de Curto Alcance
- **Custo**: Baixo (Gera "Calor", requer resfriamento curto)
- **Visual**: Éter sai do corpo (fumaça, luz, som)

#### Classe 3: Manifestação (Ambiental)
- **Foco**: Área de Efeito (AoE), Controle de Multidão, Alteração de Terreno
- **Custo**: Médio (Dano de "stress" se falhar em teste de Constituição)
- **Visual**: Ambiente reage: chão treme, ar muda temperatura

#### Classe 4: Disrupção (Alteração de Lei)
- **Foco**: Efeitos Permanentes, Invulnerabilidade Temporária, Criação de Matéria
- **Custo**: Alto (Dano na Vida Máxima ou Corrupção garantida)
- **Visual**: As leis da física local são quebradas

#### Classe 5: Horizonte de Eventos (Catastrófico)
- **Foco**: Reescrever a Narrativa/Realidade
- **Custo**: A vida do usuário ou perda do personagem
- **Visual**: Fim de Jogo - personagem vira NPC/Monstro

### ⚡ Sistema de Override
Personagens podem tentar usar uma Classe de Runa superior em momento de desespero:
- **Teste de Resistência**: Rolagem de Constituição contra DC baseada na classe da runa
- **Sucesso**: O braço usado "queima" (inutilizável até reparo médico) + Exaustão Nível 3
- **Falha**: Colapso do Patrocínio - Dano massivo em área OU mutação (Game Over para o personagem)

### 🔧 Controles do Mestre (GM)
- **Bloqueio de Classes de Runa**: O GM pode limitar qual classe máxima de runa o jogador pode usar
- **Ativar/Desativar Runas**: O GM pode desabilitar runas específicas de jogadores
- **Controle de Progressão**: Libere classes de runa conforme o personagem progride

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

### 1. Abas do Sistema
Após ativar o módulo, abra a ficha de um personagem. Você verá três novas abas:
- **Atributos de Éter** (ícone de escudo): Gerencia atributos, talentos e éter
- **Sistema de Runas** (ícone de gema): Gerencia runas e classes de runa
- **Mecânicas Únicas** (ícone de impressão digital): Gerencia mecânicas especiais por personagem

### 2. Configurando Atributos de Éter
1. Acesse a aba "Atributos de Éter"
2. Defina o valor (1-10) e rank (F a K) para cada atributo
3. O éter máximo será recalculado automaticamente

### 3. Usando Talentos
1. Na seção de Talentos, defina o valor e rank de cada talento
2. Clique no botão de dado ao lado do talento para fazer uma rolagem
3. A fórmula utilizada é: `1d20 + Talento + Rank + Atributo + Rank`

### 4. Descanso Longo
- Clique no botão "Descanso Longo" para restaurar todo o éter
- Não há regeneração passiva - éter só é restaurado com descanso longo

### 5. Criando Runas
1. Acesse a aba "Sistema de Runas"
2. Clique em "Adicionar Runa"
3. Configure:
   - **Nome**: Nome da runa (ex: "Chama Ardente")
   - **Classe**: 1 a 5 (define o poder e custo)
   - **Tipo de Custo**: O que a runa consome (ex: sangue, éter, vida)
   - **Valor do Custo**: Quantidade adicional de éter consumido
   - **Efeito**: O que a runa faz (ex: explodir, curar)
   - **Descrição**: Detalhes adicionais

### 6. Usando Runas
1. Equipe uma runa clicando no ícone de círculo
2. Clique no ícone de dado (d20) para ativar a runa
3. O sistema automaticamente:
   - Verifica se a classe da runa é permitida
   - Se for classe bloqueada, tenta Override (com consequências!)
   - Verifica se há éter suficiente
   - Consome o éter necessário
   - Rola os dados de efeito
   - Exibe o resultado no chat

### 7. Controles do GM
1. O GM vê um painel especial na aba de Runas
2. Pode definir a classe máxima de runa permitida (1-5)
3. Pode ativar/desativar runas específicas clicando no ícone de olho

### 8. Mecânicas Únicas
1. Acesse a aba "Mecânicas Únicas"
2. Selecione o perfil do personagem
3. Para Gyro Zeppeli, o módulo controla Spin Points, Nível de Rotação, IKONs, testes de Controle de Spin, Desvio da Rotação e técnicas de rotação

#### Macros úteis do Gyro

```js
await game.ethernum.macros.setUniqueProfile("gyro-spin");
```

```js
await game.ethernum.macros.showGyroStatus();
await game.ethernum.macros.showGyroTechniques();
```

```js
await game.ethernum.macros.gainGyroSP(1);
await game.ethernum.macros.spendGyroSP(1);
await game.ethernum.macros.setGyroSP(7);
```

```js
await game.ethernum.macros.startGyroCombat();
await game.ethernum.macros.rollGyroControl("forced");
await game.ethernum.macros.rollGyroControl("corpse");
await game.ethernum.macros.rollGyroControl("perfect");
await game.ethernum.macros.rollGyroDeviation();
```

```js
await game.ethernum.macros.useGyroTechnique("spiral-ricochet", "forced");
await game.ethernum.macros.useGyroTechnique("absolute-rotation", "perfect");
```

## ⚙️ Configurações

O módulo oferece as seguintes configurações (acessíveis nas configurações do módulo):

- **Restauração Total no Descanso Longo**: Se ativado, o éter será totalmente restaurado com descanso longo (padrão: ativado)
- **Mostrar Éter no Chat**: Se ativado, mostra informações de éter nas mensagens de rolagem no chat (padrão: ativado)
- **Permitir Override**: Se ativado, jogadores podem tentar usar runas de classes superiores às permitidas (padrão: ativado)

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
