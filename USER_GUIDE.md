# Guia do Usuário - Ethernum RPG Module

## Índice
1. [Visão Geral](#visão-geral)
2. [Sistema de Éter](#sistema-de-éter)
3. [Sistema de Runas](#sistema-de-runas)
4. [Calculadora de Dados](#calculadora-de-dados)
5. [Exemplos Práticos](#exemplos-práticos)
6. [Perguntas Frequentes](#perguntas-frequentes)

## Visão Geral

O Ethernum RPG Module adiciona um sistema mágico complementar ao Pathfinder 2E, baseado em "éter" - uma energia mágica alternativa que pode ser usada por todos os personagens. Este sistema funciona paralelamente ao sistema de magias do PF2E, sem substituí-lo.

## Sistema de Éter

### O que é Éter?

Éter é uma forma de energia mágica que todos os personagens podem acessar, independente de sua classe. É similar ao sistema de pontos de mana, mas integrado diretamente com os atributos do Pathfinder 2E.

### Como o Éter é Calculado?

#### Éter Máximo
```
Éter Máximo = 10 + (Inteligência × 2) + Sabedoria + (Nível × 3)
```

**Exemplo:**
- Personagem de nível 5
- Inteligência: +3
- Sabedoria: +2

Éter Máximo = 10 + (3 × 2) + 2 + (5 × 3) = 10 + 6 + 2 + 15 = **33 pontos**

#### Regeneração de Éter
```
Regeneração = max(1, (Sabedoria + Constituição) / 2)
```

Este valor representa quanto de éter o personagem recupera por período de descanso.

**Exemplo:**
- Sabedoria: +2
- Constituição: +3

Regeneração = (2 + 3) / 2 = **2.5 → 2 pontos** por descanso

#### Poder de Éter
```
Poder de Éter = Inteligência + Carisma
```

Este bônus é adicionado a rolagens que utilizam éter.

**Exemplo:**
- Inteligência: +3
- Carisma: +1

Poder de Éter = 3 + 1 = **+4** às rolagens com éter

### Gerenciando Éter

1. **Visualizar Éter**: Abra a ficha do personagem e clique na aba "Sistema de Éter"
2. **Ajustar Manualmente**: Clique no valor de éter atual para editá-lo
3. **Recalcular**: Clique em "Recalcular" após mudar atributos ou nível
4. **Descansar**: Clique em "Descansar" para restaurar o éter ao máximo

## Sistema de Runas

### O que são Runas?

Runas são artefatos mágicos que podem ser equipados pelo personagem. Cada runa possui um efeito específico e consome éter quando ativada.

### Tipos de Runas

1. **Ofensiva**: Causa dano direto aos inimigos
2. **Defensiva**: Protege o personagem ou aliados
3. **Suporte**: Concede bônus ou efeitos positivos
4. **Utilidade**: Efeitos diversos não-combate

### Criando uma Runa

1. Na aba "Sistema de Éter", role até a seção "Sistema de Runas"
2. Clique em "Adicionar Runa"
3. Preencha os campos:
   - **Nome**: Nome descritivo da runa
   - **Tipo**: Escolha entre Ofensiva, Defensiva, Suporte ou Utilidade
   - **Custo de Éter**: Quanto de éter é consumido ao ativar
   - **Poder**: Número de d6 rolados (para dano ou intensidade do efeito)
   - **Descrição**: Descreva o efeito em detalhes

### Usando Runas

1. **Equipar**: Clique no ícone de círculo para equipar/desequipar a runa
   - Runas equipadas brilham com uma animação
2. **Ativar**: Clique no ícone de d20 para ativar a runa
   - O sistema verifica automaticamente se há éter suficiente
   - O éter é consumido
   - Os dados são rolados
   - O resultado aparece no chat

### Exemplo de Runa

**Runa do Fogo Arcano**
- Tipo: Ofensiva
- Custo: 5 éter
- Poder: 3d6
- Descrição: "Lança uma explosão de fogo arcano em um inimigo a até 30 metros, causando dano de fogo."

Ao ativar esta runa:
1. 5 pontos de éter são consumidos
2. 3d6 são rolados (por exemplo: 4 + 6 + 2 = 12 de dano)
3. Uma mensagem aparece no chat: "Runa Ativada: Runa do Fogo Arcano (Custo de Éter: 5) - Resultado: 12"

## Calculadora de Dados

### Rolagens Aprimoradas

O módulo permite aprimorar rolagens com o poder de éter do personagem. Isso pode ser feito de duas formas:

1. **Através de Runas**: Ative uma runa equipada para fazer uma rolagem automaticamente
2. **Programaticamente**: Use a API do módulo para adicionar bônus de éter a qualquer rolagem

### API para Desenvolvedores

```javascript
// Fazer uma rolagem com bônus de éter
await game.ethernum.EthernumDiceCalculator.rollWithEther(
  actor,           // Ator que faz a rolagem
  "2d6 + 5",      // Fórmula base
  actor.getFlag("ethernum-rpg-module", "etherSystem.etherPower") // Bônus de éter
);

// Ativar uma runa específica
const runes = actor.getFlag("ethernum-rpg-module", "runes") || [];
const runa = runes[0]; // Primeira runa
await game.ethernum.EthernumDiceCalculator.rollRune(actor, runa);
```

## Exemplos Práticos

### Exemplo 1: Mago de Batalha

**Personagem**: Elara, Maga Nível 7
- INT: +4, WIS: +2, CHA: +1, CON: +1

**Éter:**
- Máximo: 10 + (4×2) + 2 + (7×3) = 10 + 8 + 2 + 21 = **41 pontos**
- Regeneração: (2 + 1) / 2 = **1 ponto** por descanso
- Poder: 4 + 1 = **+5** às rolagens

**Runas Equipadas:**
1. **Mísseis Arcanos**: Ofensiva, Custo 3, Poder 2d6
2. **Escudo de Força**: Defensiva, Custo 4, Poder 1d6
3. **Visão Mística**: Utilidade, Custo 2, Poder 1d6

### Exemplo 2: Guerreiro Rúnico

**Personagem**: Thorin, Guerreiro Nível 5
- INT: +1, WIS: +1, CHA: +0, CON: +3

**Éter:**
- Máximo: 10 + (1×2) + 1 + (5×3) = 10 + 2 + 1 + 15 = **28 pontos**
- Regeneração: (1 + 3) / 2 = **2 pontos** por descanso
- Poder: 1 + 0 = **+1** às rolagens

**Runas Equipadas:**
1. **Golpe Trovão**: Ofensiva, Custo 6, Poder 4d6
2. **Pele de Pedra**: Defensiva, Custo 5, Poder 2d6

### Exemplo 3: Clérigo Etéreo

**Personagem**: Aria, Clériga Nível 6
- INT: +2, WIS: +4, CHA: +2, CON: +2

**Éter:**
- Máximo: 10 + (2×2) + 4 + (6×3) = 10 + 4 + 4 + 18 = **36 pontos**
- Regeneração: (4 + 2) / 2 = **3 pontos** por descanso
- Poder: 2 + 2 = **+4** às rolagens

**Runas Equipadas:**
1. **Cura Etérea**: Suporte, Custo 4, Poder 3d6
2. **Proteção Divina**: Defensiva, Custo 5, Poder 2d6
3. **Luz Sagrada**: Ofensiva, Custo 3, Poder 2d6

## Perguntas Frequentes

### O Sistema de Éter substitui o sistema de magias do PF2E?
Não. O sistema de éter é complementar e funciona paralelamente ao sistema de magias existente.

### Quantas runas posso ter equipadas?
Não há limite de runas equipadas, mas cada runa ativada consome éter.

### O éter regenera automaticamente?
Por padrão, o éter só é restaurado quando você clica no botão "Descansar" ou manualmente. Configure "Regeneração de Éter ao Descansar" nas configurações do módulo para regeneração automática.

### Posso usar o sistema de éter com outras classes além de conjuradores?
Sim! O sistema foi projetado para ser usado por qualquer classe do PF2E.

### As runas ocupam espaço no inventário?
Não, as runas são gerenciadas em uma aba separada e não ocupam slots de equipamento tradicionais.

### Posso compartilhar runas entre personagens?
As runas são específicas para cada personagem. Para transferir, você precisaria criar a mesma runa no outro personagem.

### O que acontece se eu não tiver éter suficiente para ativar uma runa?
O sistema exibirá uma mensagem de aviso e a runa não será ativada.

### Posso criar runas com efeitos personalizados?
Sim! O campo de descrição permite detalhar qualquer efeito. No entanto, você precisará aplicar os efeitos manualmente além do dano/rolagem automática.

### Como os atributos são recalculados?
Os atributos são recalculados automaticamente ao clicar no botão "Recalcular" ou quando a ficha é reaberta após mudanças nos atributos do personagem.

## Dicas de Jogo

1. **Balance**: Considere o custo de éter vs. o poder ao criar runas
2. **Diversidade**: Tenha runas de diferentes tipos para diferentes situações
3. **Sinergias**: Combine runas com habilidades de classe para efeitos poderosos
4. **Gerenciamento**: Monitore seu éter durante combates longos
5. **Descanso**: Descanse estrategicamente para recuperar éter
6. **Personalização**: Crie runas temáticas para seu personagem

## Suporte

Para mais ajuda, visite: https://github.com/ArkiusJacker/Ethernum-RPG-Module/issues
