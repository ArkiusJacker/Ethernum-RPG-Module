# Ethernum RPG Module - Sistema de Éter

[![Foundry VTT](https://img.shields.io/badge/Foundry-13.351%20primary-orange)](https://foundryvtt.com)
[![Pathfinder 2E](https://img.shields.io/badge/System-Pathfinder%202E-blue)](https://foundryvtt.com/packages/pf2e/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Sistema de RPG com múltiplas funções, criado especificamente para integrar com o sistema Pathfinder 2E. O módulo declara Foundry VTT 13 como mínimo e versão verificada; a combinação primária testada é Foundry 13.351 com PF2e 7.8.0. Consulte a [matriz de compatibilidade](docs/COMPATIBILITY.md) para distinguir suporte testado, parcial e não suportado.

## Versão 3.8.7

- `main` foi sincronizada por fast-forward com todo o histórico publicado até a v3.8.6.
- O workflow de release agora recusa tags cujo commit não pertença ao histórico de `main` e informa tag, main e merge-base.
- O Diagnóstico da Ficha ganhou uma auditoria PF2e somente leitura para HP, CA, Percepção, salvamentos, perícias, variantes MAP, inventário, moedas, bulk, condições, Pontos Heroicos, foco e conjuração.
- Diferenças são comparadas como valores mecânicos normalizados, com detalhe expansível e relatório copiável; a auditoria nunca corrige nem atualiza o Actor.
- A matriz de compatibilidade passa a declarar apenas Foundry 13 como mínimo/verificado. Foundry 14 permanece experimental/parcial, e 11/12 deixam de ser apresentados como suporte testado.
- O registro HARVEST identifica explicitamente as famílias de mecânicas geradas e os dois experimentos de IA como `AWAITING_USER_APPROVAL`.
- Recomendações de proteção da branch principal estão documentadas em [`docs/BRANCH_PROTECTION.md`](docs/BRANCH_PROTECTION.md).

### Protocolos de desenvolvimento

- [HARVEST - Conselho da Colheita Experimental](docs/HARVEST_COUNCIL.md)
- [Testes experimentais](docs/EXPERIMENTAL_TESTS.md)
- [Registro de sessões HARVEST](docs/HARVEST_LOG.md)
- [Roadmap v3.7.9 -> v3.8.6](docs/ROADMAP_3.7.9_3.8.6.md)
- [Roadmap v3.8.7 -> v3.8.10](docs/ROADMAP_3.8.7_3.8.10.md)

### Paridade da ficha PF2e

| Feature | Ethernum | Concórdia | PF2e Fallback |
| --- | --- | --- | --- |
| HP / Temp HP / Hero Points | Native | Native | Native |
| AC / Perception / Saves | Native | Native | Native |
| Skills / Initiative / Movement | Native | Native | Native |
| Conditions / Effects / IWR | Native | Native | Native |
| Strikes / MAP / Damage / Critical | Native | Native | Native |
| Actions / Reactions / Free Actions | Native | Native | Native |
| Exploration / Downtime | Native | Native | Native |
| Inventory / Bulk / Carry Type | Native | Native | Native |
| Investment / Consumables / Containers | Native | Native | Native |
| Feats | Native | Native | Native |
| Prepared / Spontaneous / Innate spells | Native | Native | Native |
| Focus spells / Focus Points / Spell Slots | Native | Native | Native |
| Rituals | Partial | Partial | Native |
| Spell preparation management | PF2e Fallback | PF2e Fallback | Native |
| Drag/drop | Native | Native | Native |
| Class DC / Senses / Languages | Native | Native | Native |
| Biography editing | PF2e Fallback | PF2e Fallback | Native |
| Crafting | Partial | Partial | Native |

## 🌟 Características Principais

### 📊 Sistema de Éter (S.E) - Descanso Longo
- **Restauração por Descanso Longo**: Com a restauração automática habilitada, o Éter volta ao máximo no descanso longo; não há regeneração passiva
- **Atributos de Éter Separados**: Sistema de atributos independente com Força, Destreza, Constituição, Inteligência, Sabedoria e Carisma
- **Sistema de Ranks**: Progressão F → E → D → C → B → A → S → K
- **Sistema de Pontos**: Valores de 1 a 10 para cada atributo
- **Cálculo Automático**: O éter máximo e poder de éter são calculados automaticamente

### 🎲 Calculadora de Dados com Talentos
- **Fórmula de Rolagem**: `1d20 + perícia PF2e (ou Talento Ethernum) + Rank do Talento + atributo PF2e (ou Atributo Ethernum) + Rank do Atributo`
- **15 Talentos**: Investigação, Percepção, Furtividade, Atletismo, Acrobacia, Intimidação, Persuasão, Enganação, Medicina, Sobrevivência, Arcanismo, Religião, Natureza, Sociedade, Ocultismo
- **Rolagem Rápida**: Botão de dado em cada talento para rolagem imediata

### 💎 Sistema de Runas com 5 Classes

#### Classe 1: Latente
- **Foco**: Efeitos passivos, percepção sutil e conexão inicial
- **Custo**: Zero
- **Visual**: Runas brilham levemente, quase imperceptíveis

#### Classe 2: Tangível
- **Foco**: Efeitos físicos diretos e manipulação básica
- **Custo**: Baixo
- **Visual**: Éter visível e emanações claras

#### Classe 3: Dissonante
- **Foco**: Alteração de regras locais e distorção da realidade
- **Custo**: Médio
- **Visual**: O ambiente distorce e as leis físicas tremem

#### Classe 4: Crítico
- **Foco**: Efeitos permanentes e alterações fundamentais
- **Custo**: Alto
- **Visual**: Ruptura visível na realidade

#### Classe 5: Evento Zero
- **Foco**: Reescrever completamente a Narrativa/Realidade
- **Custo**: Catastrófico
- **Visual**: Colapso total e risco de fim de jogo

### ⚡ Sistema de Override
Personagens podem tentar usar uma Classe de Runa superior em momento de desespero:
- **Teste de Resistência**: Rolagem de Constituição contra DC baseada na classe da runa
- **Sucesso**: O braço usado "queima" (inutilizável até reparo médico) + Exaustão Nível 3
- **Falha**: Colapso do Patrocínio - Dano massivo em área OU mutação (Game Over para o personagem)
- **Automação atual**: O módulo informa essas consequências no chat; a aplicação mecânica é resolvida manualmente pelo GM

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

### 1. Fichas de Personagem
Após ativar o módulo, personagens usam automaticamente o shell correspondente ao core ativo:
- **Ethernum Company**: dossiê operacional com Éter, FE, Runas e Mecânica Única.
- **Concórdia**: registro arcano-industrial com Personagem, Combate, Arsenal, Magia e Mecânica Única.
- **PF2e Original**: permanece disponível no cabeçalho e no menu da ficha como fallback transitório ou override permanente.

O mestre sempre pode escolher o modo da ficha. Owners também podem escolher quando a política de mundo estiver habilitada.

O **Controle do Mestre** é um painel global separado das fichas. Ele pode ser aberto pelo launcher flutuante, pelo modo GM do Combat Momentum Tracker ou por `game.ethernum.ui.openGMControlCenter()`.

### 2. Configurando Atributos de Éter
1. Acesse a aba "Atributos de Éter"
2. Defina o valor (1-10) e rank (F a K) para cada atributo
3. O éter máximo será recalculado automaticamente

### 3. Usando Talentos
1. Na seção de Talentos, defina o valor e rank de cada talento
2. Clique no botão de dado ao lado do talento para fazer uma rolagem
3. A fórmula utilizada é: `1d20 + perícia PF2e (ou Talento Ethernum) + Rank do Talento + atributo PF2e (ou Atributo Ethernum) + Rank do Atributo`

### 4. Descanso Longo
- Clique no botão "Descanso Longo" para restaurar todo o Éter quando a restauração automática estiver habilitada
- Com a configuração desabilitada, o descanso não altera o Éter
- Não há regeneração passiva

### 5. Criando Runas
1. Acesse a aba "Sistema de Runas"
2. Clique em "Adicionar Runa"
3. Configure:
   - **Nome**: Nome da runa (ex: "Chama Ardente")
   - **Classe**: 1 a 5 (define o poder e custo)
   - **Tipo de Custo**: Descrição narrativa do custo (ex: sangue, Éter, vida); nesta versão, o consumo automático ainda usa Éter
   - **Valor do Custo**: Quantidade adicional de éter consumido
   - **Efeito**: O que a runa faz (ex: explodir, curar)
   - **Descrição**: Detalhes adicionais

### 6. Usando Runas
1. Equipe uma runa clicando no ícone de círculo
2. Clique no ícone de dado (d20) para ativar a runa
3. O sistema automaticamente:
   - Verifica se a classe da runa é permitida
   - Se for classe bloqueada e Override estiver habilitado, tenta Override
   - Se Override estiver desabilitado, bloqueia a ativação antes da rolagem
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
4. Em Concórdia, Charles possui cargas e ferramentas de engenharia; Atlas Sidarta modifica magias divinas; Arkius Jacker e Yu mantêm seus painéis e automações próprios

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

#### Macros de Bayle e Pipping

```js
await game.ethernum.macros.setUniqueProfile("bayle-dragon");
await game.ethernum.macros.showBayleStatus();
await game.ethernum.macros.adjustBayleArdor(1);
await game.ethernum.macros.toggleBayleRage();
await game.ethernum.macros.toggleBayleAwakening();
await game.ethernum.macros.useBayleAction("placidusax-lightning");
```

```js
await game.ethernum.macros.setUniqueProfile("pipping-night");
await game.ethernum.macros.showPippingStatus();
await game.ethernum.macros.adjustPippingPulse(1);
await game.ethernum.macros.ethernumCompany.pipping.activateLivingNight();
await game.ethernum.macros.ethernumCompany.pipping.endLivingNight();
await game.ethernum.macros.ethernumCompany.pipping.communeWithNight();
await game.ethernum.macros.ethernumCompany.pipping.useAction("ruin-note");
await game.ethernum.macros.ethernumCompany.pipping.useReaction("void-echoes");
await game.ethernum.macros.ethernumCompany.pipping.useFinisher("dead-sun-epitaph");
await game.ethernum.macros.ethernumCompany.pipping.configureDarkness();
await game.ethernum.macros.ethernumCompany.pipping.resolveDarkness();
await game.ethernum.macros.ethernumCompany.pipping.animationDiagnostics();
```

Pipping possui cinco Tiers liberados pelos níveis 3, 5, 9, 13 e 17. Cada Tier permite escolher Destruição, Ordem ou Caos; habilidades de escolhas diferentes permanecem visíveis, mas bloqueadas. Na v3.5.4, cada carta funciona como uma referência mecânica completa, com ativação, custo, alvos, alcance, área, salvamento, graus de sucesso, duração, requisitos, scaling e automação por componente usando os mesmos descritores da execução.

Sombra Animada e Sombras Espelhadas abrem uma prévia no canvas: mova o cursor para escolher o ponto, clique, confirme e a manifestação sorteada aparece na posição válida. O alcance cresce de 10 para 20 e 30 pés conforme o Tier. Coro do Fim usa um cone confirmado, Sombra-Rei parte da posição da sombra e Epitáfio do Sol Morto permite escolher o centro da explosão e da escuridão persistente.

Salvamentos usam a API da ficha PF2e quando disponível. Dano tipado respeita IWR pela aplicação do PF2e; ambientes sem API pública compatível recebem um resultado assistido claramente identificado. Movimentação forçada, redução da instância de dano, comandos e passagens por obstáculos continuam exigindo confirmação do mestre.

As animações de Pipping podem ser configuradas por cliente como completas, reduzidas ou desativadas, com velocidade rápida, normal ou cinemática. O hover das cartas também possui modo completo, reduzido ou desativado e uma opção separada de prévia local no token. Sequencer e JB2A são opcionais; o módulo valida as chaves uma vez por sessão, oferece diagnóstico ao mestre, mantém fallbacks próprios em PIXI/DOM e respeita a preferência de movimento reduzido do sistema.

#### Macros de Charles e Atlas Sidarta

```js
await game.ethernum.macros.setUniqueProfile("charles");
await game.ethernum.macros.concordia.charles.showStatus();
await game.ethernum.macros.concordia.charles.impulseClimb();
await game.ethernum.macros.concordia.charles.containmentShot();
await game.ethernum.macros.concordia.charles.vectorPull();
await game.ethernum.macros.concordia.charles.cushioningNet();
await game.ethernum.macros.concordia.charles.cushioningNet(null, true);
await game.ethernum.macros.concordia.charles.craftImagination();
```

```js
await game.ethernum.macros.setUniqueProfile("atlas-sidarta");
await game.ethernum.macros.concordia.atlas.showStatus();
await game.ethernum.macros.concordia.atlas.olharDoDivino();
await game.ethernum.macros.concordia.atlas.completeDivineGaze();
```

### 9. Rastreador global de combate

O rastreador de Momentum Fides e Fulgor Negro fica disponível sobre o canvas, sem depender de uma ficha aberta.

- A visão **Jogador** acompanha o personagem atribuído ou o token controlado, exibe as marcas e cargas de Fides, a cadeia de Fulgor e os resultados do combate.
- A visão **Mestre** reúne os personagens dos jogadores e oferece correção de marcas, concessão ou encerramento de Fulgor e resets de combate ou preparações diárias.
- Falhas e críticos de testes com d20 são lidos diretamente das mensagens do PF2e. Resultado natural e grau final permanecem separados; Fides e Fulgor continuam restritos a ataques contra CA.
- O estado diário fica salvo na flag do ator; marcas, estatísticas do encontro e cadeias são limpas ao encerrar o combate.
- O temporizador de turnos fica visível para todos e é controlado pelo mestre, com duração em segundos ou minutos, pausa, reset e avanço automático opcional.
- O timer usa timestamps e flags do combate apenas em eventos importantes; a contagem visual local não grava dados a cada segundo.

Os dois macros gerenciados também podem ser chamados pela API:

```js
await game.ethernum.macros.combat.momentumFides();
await game.ethernum.macros.combat.fulgorNegro();
```

Limites conhecidos da integração com o PF2e:

- Rerrolagens são ignoradas pelo tracker para evitar dupla contagem; o mestre pode corrigir o placar pelos controles da mesa.
- Em um ataque manual convertido por Fides, o card do Ethernum registra a adjudicação, mas não reescreve a mensagem original nem automações de outros módulos que já tenham recebido a falha. O macro de Fides é o fluxo recomendado porque também resolve o dano.

## ⚙️ Configurações

O módulo oferece as seguintes configurações (acessíveis nas configurações do módulo):

- **Restauração Total no Descanso Longo**: Se ativado, o Éter será totalmente restaurado; se desativado, o descanso não altera o recurso (padrão: ativado)
- **Mostrar Éter no Chat**: Se ativado, mostra o custo de Éter nas mensagens de ativação de runa; o custo continua sendo aplicado quando a opção está desativada (padrão: ativado)
- **Permitir Override**: Se ativado, jogadores podem tentar usar runas de classes superiores às permitidas (padrão: ativado)
- **Exibir rastreador de combate Ethernum**: Mostra ou oculta o painel para o cliente atual
- **Rastreador somente durante combate**: Oculta o painel fora de encontros iniciados
- **Exibir estatísticas detalhadas**: Controla a exibição dos contadores expandidos
- **Animações de Fides e Fulgor**: Seleciona efeitos completos, reduzidos ou desativados para o cliente atual

## 🔧 Requisitos

- **Foundry VTT**: Compatibilidade declarada da versão 11 à 14; validação prática da v14 ainda pendente
- **Sistema**: Pathfinder 2E (pf2e); a faixa de versões suportada será definida após testes práticos

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
