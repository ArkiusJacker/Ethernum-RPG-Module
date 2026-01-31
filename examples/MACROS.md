# Macros de Exemplo para Ethernum RPG Module

Este documento contém macros úteis que podem ser usadas com o Ethernum RPG Module.

## Como Usar Estas Macros

1. No Foundry VTT, clique em "Macros" no menu lateral
2. Clique em "Create Macro"
3. Defina o tipo como "Script"
4. Cole o código da macro
5. Dê um nome à macro
6. Salve e arraste para a hotbar

## Macro 1: Verificar Éter do Personagem

Mostra o éter atual do personagem selecionado.

```javascript
// Verificar Éter
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

if (!actor) {
  ui.notifications.error("Nenhum personagem selecionado!");
  return;
}

const etherSystem = actor.getFlag("ethernum-rpg-module", "etherSystem");

if (!etherSystem) {
  ui.notifications.warn("Este personagem não tem sistema de éter configurado.");
  return;
}

ChatMessage.create({
  speaker: ChatMessage.getSpeaker({actor: actor}),
  content: `
    <div class="ethernum-chat-card">
      <h3>Sistema de Éter</h3>
      <p><strong>Éter Atual:</strong> ${etherSystem.etherCurrent} / ${etherSystem.etherMax}</p>
      <p><strong>Regeneração:</strong> ${etherSystem.etherRegen} por descanso</p>
      <p><strong>Poder de Éter:</strong> +${etherSystem.etherPower}</p>
    </div>
  `
});
```

## Macro 2: Gastar Éter

Permite gastar uma quantidade específica de éter.

```javascript
// Gastar Éter
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

if (!actor) {
  ui.notifications.error("Nenhum personagem selecionado!");
  return;
}

const etherSystem = actor.getFlag("ethernum-rpg-module", "etherSystem");

if (!etherSystem) {
  ui.notifications.warn("Este personagem não tem sistema de éter configurado.");
  return;
}

// Pedir quantidade
let amount = await Dialog.prompt({
  title: "Gastar Éter",
  content: `
    <p>Éter Atual: ${etherSystem.etherCurrent} / ${etherSystem.etherMax}</p>
    <p>Quanto éter deseja gastar?</p>
    <input type="number" id="ether-amount" min="0" max="${etherSystem.etherCurrent}" value="1" />
  `,
  callback: (html) => {
    return parseInt(html.find("#ether-amount").val());
  }
});

if (amount && amount > 0) {
  const newCurrent = Math.max(0, etherSystem.etherCurrent - amount);
  await actor.setFlag("ethernum-rpg-module", "etherSystem.etherCurrent", newCurrent);
  
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor: actor}),
    content: `Gastou ${amount} de éter. (${newCurrent} / ${etherSystem.etherMax} restante)`
  });
}
```

## Macro 3: Recuperar Éter

Recupera uma quantidade específica de éter.

```javascript
// Recuperar Éter
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

if (!actor) {
  ui.notifications.error("Nenhum personagem selecionado!");
  return;
}

const etherSystem = actor.getFlag("ethernum-rpg-module", "etherSystem");

if (!etherSystem) {
  ui.notifications.warn("Este personagem não tem sistema de éter configurado.");
  return;
}

// Pedir quantidade
let amount = await Dialog.prompt({
  title: "Recuperar Éter",
  content: `
    <p>Éter Atual: ${etherSystem.etherCurrent} / ${etherSystem.etherMax}</p>
    <p>Regeneração base: ${etherSystem.etherRegen}</p>
    <p>Quanto éter deseja recuperar?</p>
    <input type="number" id="ether-amount" min="0" value="${etherSystem.etherRegen}" />
  `,
  callback: (html) => {
    return parseInt(html.find("#ether-amount").val());
  }
});

if (amount && amount > 0) {
  const newCurrent = Math.min(etherSystem.etherMax, etherSystem.etherCurrent + amount);
  await actor.setFlag("ethernum-rpg-module", "etherSystem.etherCurrent", newCurrent);
  
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor: actor}),
    content: `Recuperou ${amount} de éter. (${newCurrent} / ${etherSystem.etherMax})`
  });
}
```

## Macro 4: Listar Runas

Lista todas as runas do personagem com suas propriedades.

```javascript
// Listar Runas
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

if (!actor) {
  ui.notifications.error("Nenhum personagem selecionado!");
  return;
}

const runes = actor.getFlag("ethernum-rpg-module", "runes") || [];

if (runes.length === 0) {
  ui.notifications.info("Este personagem não possui runas.");
  return;
}

let content = "<h3>Runas</h3><ul>";

for (const rune of runes) {
  const status = rune.equipped ? "⚡ EQUIPADA" : "○ Não equipada";
  content += `
    <li>
      <strong>${rune.name}</strong> ${status}<br>
      <em>Tipo:</em> ${rune.type} | 
      <em>Custo:</em> ${rune.etherCost} éter | 
      <em>Poder:</em> ${rune.power}d6<br>
      <em>${rune.description || 'Sem descrição'}</em>
    </li>
  `;
}

content += "</ul>";

ChatMessage.create({
  speaker: ChatMessage.getSpeaker({actor: actor}),
  content: content
});
```

## Macro 5: Ativar Runa por Nome

Permite ativar uma runa específica pelo nome.

```javascript
// Ativar Runa por Nome
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

if (!actor) {
  ui.notifications.error("Nenhum personagem selecionado!");
  return;
}

const runes = actor.getFlag("ethernum-rpg-module", "runes") || [];

if (runes.length === 0) {
  ui.notifications.info("Este personagem não possui runas.");
  return;
}

// Criar opções para o diálogo
let options = "";
for (const rune of runes) {
  const status = rune.equipped ? " (Equipada)" : "";
  options += `<option value="${rune.id}">${rune.name}${status} - ${rune.etherCost} éter</option>`;
}

// Selecionar runa
let runeId = await Dialog.prompt({
  title: "Ativar Runa",
  content: `
    <p>Selecione a runa a ativar:</p>
    <select id="rune-select">${options}</select>
  `,
  callback: (html) => {
    return html.find("#rune-select").val();
  }
});

if (runeId) {
  const rune = runes.find(r => r.id === runeId);
  if (rune) {
    await game.ethernum.EthernumDiceCalculator.rollRune(actor, rune);
  }
}
```

## Macro 6: Criar Runa Rápida

Cria uma nova runa rapidamente com um diálogo.

```javascript
// Criar Runa Rápida
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

if (!actor) {
  ui.notifications.error("Nenhum personagem selecionado!");
  return;
}

const result = await Dialog.prompt({
  title: "Criar Nova Runa",
  content: `
    <form>
      <div class="form-group">
        <label>Nome da Runa:</label>
        <input type="text" id="rune-name" value="Nova Runa" />
      </div>
      <div class="form-group">
        <label>Tipo:</label>
        <select id="rune-type">
          <option value="ofensiva">Ofensiva</option>
          <option value="defensiva">Defensiva</option>
          <option value="suporte">Suporte</option>
          <option value="utilidade">Utilidade</option>
        </select>
      </div>
      <div class="form-group">
        <label>Custo de Éter:</label>
        <input type="number" id="rune-cost" value="1" min="0" />
      </div>
      <div class="form-group">
        <label>Poder (dados d6):</label>
        <input type="number" id="rune-power" value="1" min="0" />
      </div>
      <div class="form-group">
        <label>Descrição:</label>
        <textarea id="rune-desc" rows="3"></textarea>
      </div>
    </form>
  `,
  callback: (html) => {
    return {
      name: html.find("#rune-name").val(),
      type: html.find("#rune-type").val(),
      etherCost: parseInt(html.find("#rune-cost").val()),
      power: parseInt(html.find("#rune-power").val()),
      description: html.find("#rune-desc").val()
    };
  }
});

if (result) {
  const currentRunes = actor.getFlag("ethernum-rpg-module", "runes") || [];
  currentRunes.push({
    id: foundry.utils.randomID(),
    name: result.name,
    type: result.type,
    etherCost: result.etherCost,
    power: result.power,
    description: result.description,
    equipped: false
  });
  
  await actor.setFlag("ethernum-rpg-module", "runes", currentRunes);
  ui.notifications.info(`Runa "${result.name}" criada com sucesso!`);
}
```

## Macro 7: Descanso Completo

Restaura o éter ao máximo (simula descanso completo).

```javascript
// Descanso Completo
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

if (!actor) {
  ui.notifications.error("Nenhum personagem selecionado!");
  return;
}

const etherSystem = actor.getFlag("ethernum-rpg-module", "etherSystem");

if (!etherSystem) {
  ui.notifications.warn("Este personagem não tem sistema de éter configurado.");
  return;
}

await actor.setFlag("ethernum-rpg-module", "etherSystem.etherCurrent", etherSystem.etherMax);

ChatMessage.create({
  speaker: ChatMessage.getSpeaker({actor: actor}),
  content: `
    <div class="ethernum-chat-card">
      <h3>Descanso Completo</h3>
      <p>${actor.name} descansou e recuperou todo seu éter!</p>
      <p><strong>Éter Atual:</strong> ${etherSystem.etherMax} / ${etherSystem.etherMax}</p>
    </div>
  `
});
```

## Macro 8: Rolagem com Bônus de Éter

Faz uma rolagem personalizada com bônus de éter.

```javascript
// Rolagem com Bônus de Éter
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

if (!actor) {
  ui.notifications.error("Nenhum personagem selecionado!");
  return;
}

const etherSystem = actor.getFlag("ethernum-rpg-module", "etherSystem");

if (!etherSystem) {
  ui.notifications.warn("Este personagem não tem sistema de éter configurado.");
  return;
}

const formula = await Dialog.prompt({
  title: "Rolagem com Éter",
  content: `
    <p>Poder de Éter: +${etherSystem.etherPower}</p>
    <p>Digite a fórmula de dados (ex: 2d6, 1d20+5):</p>
    <input type="text" id="dice-formula" value="1d20" />
    <p><input type="checkbox" id="add-ether" checked /> Adicionar Poder de Éter à rolagem</p>
  `,
  callback: (html) => {
    const base = html.find("#dice-formula").val();
    const addEther = html.find("#add-ether").prop("checked");
    return addEther ? `${base} + ${etherSystem.etherPower}` : base;
  }
});

if (formula) {
  await game.ethernum.EthernumDiceCalculator.rollWithEther(actor, formula, 0);
}
```

## Dicas de Uso

1. **Organize suas macros**: Crie uma pasta no Foundry chamada "Ethernum" para organizar essas macros
2. **Personalize**: Modifique as macros conforme suas necessidades
3. **Compartilhe**: Compartilhe macros úteis com outros jogadores
4. **Combine**: Use múltiplas macros em sequência para efeitos complexos

## Macros Avançadas

Para criar macros mais avançadas, você pode acessar:
- `game.ethernum.EtherSystem` - Classe do sistema de éter
- `game.ethernum.RuneSystem` - Classe do sistema de runas
- `game.ethernum.EthernumDiceCalculator` - Classe da calculadora
- `game.ethernum.ETHERNUM` - Constantes do módulo
