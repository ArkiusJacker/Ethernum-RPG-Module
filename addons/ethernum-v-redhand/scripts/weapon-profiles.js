// Explicit combat data for the roulette weapons. PF2e compendium entries supply
// document shape only; V's damage, traits, Way and ammunition come from here.
const profile = (mode, family, damageDice, damageDie, damageType, options = {}) => ({
  mode,
  family,
  hands: options.hands ?? 1,
  damage: { dice: damageDice, die: damageDie, type: damageType },
  damageOptions: (options.damageOptions ?? [damageType]).map(type => ({ type, label: type })),
  traits: [...(options.traits ?? [])],
  group: options.group ?? (mode === "G" ? "firearm" : family === "Faca" ? "knife" : family === "Clava" ? "club" : "sword"),
  range: options.range ?? null,
  reach: options.reach ?? null,
  capacity: options.capacity ?? null,
  ammoKind: options.ammoKind ?? null,
  reload: options.reload ?? null,
  runes: options.runes ?? { enabled: true },
  wayId: options.wayId ?? (mode === "S" ? "drifter" : family === "Escopeta" || family === "Lancer" ? "vanguard" : family === "Pesada" || family === "Rifle" ? "sniper" : "pistolero"),
  specialActions: options.specialActions ?? [],
});

const pistol = (dice, die, type = "piercing", options = {}) => profile("G", "Pistola", dice, die, type, {
  range: 18, capacity: 6, ammoKind: "magazine", reload: { actions: 1, label: "1 ação, pente completo" }, ...options,
});
const shotgun = (dice = 2, die = "d8", type = "piercing", options = {}) => profile("G", "Escopeta", dice, die, type, {
  hands: 2, range: 9, capacity: 2, ammoKind: "shell", reload: { actions: 1, label: "1 ação por cartucho" }, traits: ["concussive"], wayId: "vanguard", ...options,
});
const pair = (options = {}) => profile("G", "Par", 1, "d6", "piercing", {
  hands: 2, range: 18, capacity: 6, ammoKind: "pair", reload: { actions: 1, label: "1 ação por pistola" },
  traits: ["agile", "fatal-d10"], wayId: "pistolero", ...options,
});
const sword = (dice, die, type = "slashing", options = {}) => profile("S", options.family ?? "Espada", dice, die, type, {
  range: null, capacity: null, ammoKind: null, reload: null, wayId: "drifter", ...options,
});

export const weaponProfiles = {
  "Sword Cutlass": pistol(1, "d6", "piercing", { traits: ["fatal-d10"], specialActions: [{ name: "Ricochete", actions: 1, description: "Strike grátis contra uma criatura adjacente ao alvo principal; causa 1 dano perfurante, sem salvamento.", kind: "manual-effect" }] }),
  "Desert Eagle": pistol(1, "d6", "piercing", { traits: ["fatal-d10"] }),
  ".45 Long Colt": pistol(1, "d6", "piercing", { traits: ["fatal-d10", "nonlethal"] }),
  "Coach Gun": shotgun(2, "d8", "piercing"),
  "Peacekeeper": pistol(1, "d6", "piercing", { range: 27, traits: ["fatal-d10"] }),
  "W-870": shotgun(2, "d8", "piercing", { range: 4.5 }),
  "Boomstick": shotgun(2, "d8", "bludgeoning"),
  "Malorian Arms 3516": pistol(1, "d6", "piercing", { damageOptions: ["piercing", "fire"], traits: ["fatal-d10"], specialActions: [{ name: "Descarga de Boca", actions: 0, type: "free", description: "Uma criatura adjacente sofre 1 dano de fogo; sem salvamento.", kind: "manual-effect" }] }),
  Lawgiver: pistol(1, "d6", "piercing", { damageOptions: ["piercing", "fire", "electricity"], traits: ["fatal-d10"] }),
  Lancer: profile("G", "Lancer", 1, "d10", "piercing", { hands: 2, range: 18, capacity: 5, ammoKind: "magazine", reload: { actions: 2, label: "2 ações por pente" }, traits: [], wayId: "vanguard", specialActions: [
    { name: "Modo Corrente", actions: 1, description: "Altera o Lancer para um Strike corpo a corpo de 1d10 cortante; não aplica traços de arma de fogo.", kind: "mode" },
    { name: "Execução da Motosserra", actions: 1, description: "Contra alvo adjacente com deslocamento reduzido ou off-guard: Strike corpo a corpo, +2d6 cortante; no acerto, deixa o alvo off-guard.", kind: "strike" },
  ] }),
  "Plasma Cutter": pistol(1, "d6", "slashing", { damageOptions: ["slashing", "piercing"], traits: ["fatal-d10"] }),
  "Ace of Spades": pistol(1, "d6", "piercing", { traits: ["fatal-d10"] }),
  "Ray Gun": pistol(1, "d6", "force"),
  "Ebony & Ivory": pair(),
  "Scarborough Fair": pair(),
  "Twin Colts": pair(),
  "Casull & Jackal": pair(),
  Railgun: profile("G", "Pesada", 2, "d8", "electricity", { hands: 2, range: 24, capacity: 3, ammoKind: "bullet", reload: { actions: 1, label: "1 ação por bala" }, traits: ["fatal-d10"], wayId: "sniper", specialActions: [{ name: "Perfuração em Série", actions: 1, description: "Strike; uma segunda criatura na linha, até 3 m atrás do alvo, sofre metade do dano rolado, sem salvamento.", kind: "strike" }] }),
  "Kraber .50-cal": profile("G", "Pesada", 2, "d10", "piercing", { hands: 2, range: 36, capacity: 3, ammoKind: "bullet", reload: { actions: 1, label: "1 ação por bala" }, traits: ["fatal-d12"], wayId: "sniper", specialActions: [{ name: "Tiro Calculado", actions: 1, description: "Se o alvo ainda não agiu ou está off-guard, faça um Strike que soma +2d10 de precisão.", kind: "strike" }] }),

  Frigideira: sword(1, "d4", "bludgeoning", { family: "Clava", traits: ["agile"] }),
  "Combat Knife": sword(1, "d6", "piercing", { family: "Faca", damageOptions: ["piercing", "slashing"], traits: ["agile", "finesse"] }),
  Crowbar: sword(1, "d8", "bludgeoning", { family: "Clava" }),
  Katana: sword(1, "d8", "slashing"),
  "Hidden Blade": sword(1, "d6", "piercing", { family: "Faca", traits: ["agile", "finesse"] }),
  "Saw Cleaver": sword(1, "d8", "slashing", { damageOptions: ["slashing", "bludgeoning"], specialActions: [{ name: "Alternar Forma", actions: 1, description: "Altera a forma da lâmina e o dano-base conforme a carta.", kind: "mode" }] }),
  "Buster Sword": sword(2, "d12", "slashing", { hands: 2 }),
  "Kunai de Scorpion": sword(1, "d6", "piercing", { family: "Faca", reach: 3, traits: ["reach-10"] }),
  "Energy Sword": sword(1, "d8", "fire"),
  Dragonslayer: sword(2, "d12", "slashing", { hands: 2, reach: 3, traits: ["reach-10"] }),
  "Dragon Sword": sword(1, "d8", "slashing"),
  Frostmourne: sword(2, "d12", "slashing", { hands: 2, damageOptions: ["slashing", "cold"] }),
  "Kingdom Key": sword(1, "d8", "bludgeoning"),
  "Blood Berry": sword(1, "d8", "fire"),
  Leviathan: sword(1, "d8", "slashing", { damageOptions: ["slashing", "cold"], specialActions: [{ name: "Inverno Particular", actions: 1, description: "No acerto, reduz o deslocamento do alvo em 3 m (mínimo 1,5 m) até o próximo turno.", kind: "strike-effect" }] }),
  "Blades of Chaos": sword(1, "d6", "slashing", { family: "Corrente", reach: 3, traits: ["reach-10"], specialActions: [{ name: "Arco de Cinzas", actions: 1, description: "Outra criatura ao alcance sofre 6 de dano de fogo, sem salvamento.", kind: "manual-effect" }] }),
  Murasama: sword(1, "d8", "slashing"),
  Rebellion: sword(1, "d8", "slashing", { specialActions: [{ name: "Stinger", actions: 1, description: "Stride até 6 m em linha reta e faça um Strike ao alcance.", kind: "strike" }] }),
  "Soul Edge": sword(2, "d12", "slashing", { hands: 2, specialActions: [{ name: "Fome de uma Cópia", actions: 1, description: "No acerto, V recebe 6 PV temporários e deixa o alvo off-guard até o próximo turno.", kind: "strike-effect" }] }),

  "Piercer Revolver": pistol(1, "d6", "piercing", { traits: ["fatal-d10"] }),
  Skippy: pistol(1, "d6", "piercing", { traits: ["fatal-d10"], specialActions: [{ name: "Mira Conversada", actions: 1, description: "Marque um alvo visto a até 18 m. O próximo Strike recebe +1 circunstancial; se acertar o alvo marcado, soma +2 de precisão.", kind: "mark" }] }),
  "Faca de Campanha 4CW": sword(1, "d6", "slashing", { family: "Faca", damageOptions: ["slashing", "piercing"], traits: ["agile", "finesse"] }),
};

export function weaponProfileFor(form) {
  const name = String(form?.name ?? "").replace(/ · (?:Esquerda|Direita)$/i, "");
  const source = weaponProfiles[name];
  if (!source) return null;
  const damageType = source.damageOptions.some(option => option.type === form?.damageChoice)
    ? form.damageChoice
    : source.damage.type;
  return {
    ...source,
    dice: source.damage.dice,
    die: source.damage.die,
    damageType,
    traits: [...source.traits],
    damageOptions: source.damageOptions.map(option => ({ ...option })),
    specialActions: source.specialActions.map(action => ({ ...action })),
  };
}

export function validateWeaponProfileCatalog({ weaponsG, weaponsS, wayProfiles }) {
  const errors = [];
  const names = new Set();
  for (const [mode, weapons] of [["G", weaponsG], ["S", weaponsS]]) {
    for (const entry of weapons) {
      const name = entry[0];
      const item = weaponProfiles[name];
      if (names.has(name)) errors.push(`Nome duplicado: ${name}`);
      names.add(name);
      if (!item) { errors.push(`Perfil ausente: ${name}`); continue; }
      if (item.mode !== mode) errors.push(`Modo incompatível: ${name}`);
      if (!Number.isInteger(item.damage.dice) || item.damage.dice < 1 || !/^d(?:4|6|8|10|12)$/.test(item.damage.die)) errors.push(`Dano inválido: ${name}`);
      if (!item.damageOptions.length || !item.damageOptions.some(option => option.type === item.damage.type)) errors.push(`Opções de dano inválidas: ${name}`);
      if (mode === "G" && (!(item.range > 0) || !(item.capacity > 0) || !item.ammoKind || !item.reload?.actions)) errors.push(`Alcance/munição/recarga inválidos: ${name}`);
      if (!wayProfiles[item.wayId]) errors.push(`Way inexistente: ${name} → ${item.wayId}`);
      if (item.traits.some(trait => typeof trait !== "string" || !trait)) errors.push(`Traço inválido: ${name}`);
      if (!Array.isArray(item.specialActions)) errors.push(`Ações especiais inválidas: ${name}`);
    }
  }
  return errors;
}

export function validateUltimateProfileCatalog({ ultimates, profiles, wayProfiles }) {
  const errors = [];
  const names = new Set();
  for (const [id, name] of ultimates) {
    const item = profiles[name];
    if (names.has(name)) errors.push(`Ultimate duplicada: ${name}`);
    names.add(name);
    if (!item) { errors.push(`Perfil Ultimate ausente: ${name}`); continue; }
    if (!/^U\d{2}$/.test(id)) errors.push(`ID Ultimate inválido: ${id}`);
    if (!["G", "S"].includes(item.mode) || !Number.isInteger(item.hands) || ![1, 2].includes(item.hands)) errors.push(`Modo/mãos inválidos: ${name}`);
    if (!Number.isInteger(item.dice) || item.dice < 1 || !/^d(?:4|6|8|10|12)$/.test(item.die) || !item.damageType) errors.push(`Dano inválido: ${name}`);
    const wayId = item.wayId ?? (item.mode === "S" ? "drifter" : item.family === "Escopeta" ? "vanguard" : item.family === "Pesada" ? "sniper" : "pistolero");
    if (!wayProfiles[wayId]) errors.push(`Way inexistente: ${name} → ${wayId}`);
    if (!["strike", "save"].includes(item.kind)) errors.push(`Resolução ausente: ${name}`);
    if (item.kind === "strike" && (!/^\d+d(?:4|6|8|10|12)$/.test(item.bonus ?? "") || !item.bonusType)) errors.push(`Bônus de Strike inválido: ${name}`);
    if (item.kind === "save" && (!/^\d+d(?:4|6|8|10|12)$/.test(item.formula ?? "") || !item.formulaType || !item.area || !item.defense)) errors.push(`Perfil de salvamento incompleto: ${name}`);
    if (item.range !== undefined && item.range !== null && !(Number(item.range) > 0)) errors.push(`Alcance inválido: ${name}`);
    if (item.ammoKind && !(Number(item.capacity) > 0)) errors.push(`Munição inválida: ${name}`);
  }
  for (const name of Object.keys(profiles)) if (!names.has(name)) errors.push(`Perfil Ultimate sem entrada no catálogo: ${name}`);
  return errors;
}
