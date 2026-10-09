import { cromaActivation, cromas, ultimateProfiles, ultimates, wayProfiles } from "./data.js";
import { weaponProfileFor } from "./weapon-profiles.js";

const MODULE_ID = "ethernum-v-redhand";
const packIndexCache = new Map();
const prototypeCache = new Map();
const slugify = value => String(value ?? "item").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";

function ownedValue(item, key) {
  return item.getFlag?.(MODULE_ID, key) ?? item.flags?.[MODULE_ID]?.[key] ?? null;
}

function stripDocumentFields(source) {
  const clean = foundry.utils.deepClone(source);
  for (const key of ["_id", "_stats", "folder", "sort", "ownership", "pack"]) delete clean[key];
  return clean;
}

async function packIndex(packName, fields = ["name", "type", "system.slug", "system.group", "system.range"]) {
  const key = `${game.system.id}.${packName}`;
  if (!packIndexCache.has(key)) {
    const pack = game.packs.get(key);
    if (!pack) return [];
    packIndexCache.set(key, pack.getIndex({ fields }).catch(() => []));
  }
  return packIndexCache.get(key);
}

async function packDocument(packName, choose) {
  const key = `${game.system.id}.${packName}`;
  const pack = game.packs.get(key);
  if (!pack) return null;
  const index = await packIndex(packName);
  const entry = choose(index);
  return entry ? pack.getDocument(entry._id) : null;
}

async function itemPrototype(type, family) {
  const cacheKey = `${type}:${family}`;
  if (prototypeCache.has(cacheKey)) return prototypeCache.get(cacheKey);
  const promise = (async () => {
    const document = type === "weapon"
      ? await packDocument("equipment-srd", index => {
        const items = index.filter(entry => entry.type === "weapon");
        const slugs = family === "ranged"
          ? ["dueling-pistol", "flintlock-pistol", "arquebus", "jezail", "hand-crossbow"]
          : ["longsword", "dagger", "shortsword", "battle-axe", "club"];
        for (const slug of slugs) {
          const match = items.find(entry => entry.system?.slug === slug || slugify(entry.name) === slug);
          if (match) return match;
        }
        const matching = items.find(entry => family === "ranged" ? Boolean(entry.system?.range) : !entry.system?.range);
        return matching ?? items[0] ?? null;
      })
      : await packDocument("equipment-srd", index => index.find(entry => entry.type === "equipment") ?? null);
    return document ? stripDocumentFields(document.toObject()) : null;
  })();
  prototypeCache.set(cacheKey, promise);
  return promise;
}

function metersToFeet(meters) {
  return Math.max(5, Math.round(Number(meters) * 3.28084 / 5) * 5);
}

function damageTypeLabel(type) {
  return ({
    bludgeoning: "contundente",
    cold: "frio",
    electricity: "elétrico",
    fire: "fogo",
    force: "força",
    piercing: "perfurante",
    slashing: "cortante",
    spirit: "espírito",
  })[type] ?? String(type ?? "").replaceAll("-", " ");
}

function profileFor(form) {
  const ultimate = form?.isUltimate ? ultimateProfiles[form.name] : null;
  const explicit = weaponProfileFor(form ?? {});
  const profile = ultimate ?? explicit;
  if (!profile) throw new Error(`Não existe perfil explícito de arma para ${form?.name ?? "forma atual"}.`);
  return {
    ...profile,
    damageType: form?.damageChoice && profile.damageOptions?.some(option => option.type === form.damageChoice)
      ? form.damageChoice
      : profile.damageType ?? profile.damage?.type,
    traits: [...new Set([...(profile.traits ?? []), ...(profile.fatal ? [profile.fatal] : [])])],
  };
}

function allowedTraits(values) {
  const config = CONFIG.PF2E.weaponTraits;
  const choices = config instanceof Map ? new Set(config.keys()) : new Set(Object.keys(config ?? {}));
  return [...new Set(values)].filter(value => choices.has(value));
}

function managedSource(source, role, key) {
  source.flags ??= {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    managedRole: role,
    managedKey: key,
  };
  const signatureData = { name: source.name, type: source.type, system: source.system };
  source.flags[MODULE_ID].managedSignature = JSON.stringify(signatureData);
  return source;
}

async function weaponSource(actor, form, { role = "manifested-weapon", key = "manifested", runes = true, extra = null } = {}) {
  const profile = extra ?? profileFor(form);
  const ranged = profile.mode === "G";
  const blueprint = await itemPrototype("weapon", ranged ? "ranged" : "melee");
  if (!blueprint) throw new Error("O compêndio de Equipamentos PF2e não está disponível para criar a arma de V.");
  const source = stripDocumentFields(blueprint);
  const state = stateFor(actor);
  const mk = Number(state.gloveMk ?? 1);
  const potency = runes ? [1, 2, 2, 3, 3][Math.max(0, Math.min(4, mk - 1))] : 0;
  const striking = runes ? [1, 1, 2, 2, 3][Math.max(0, Math.min(4, mk - 1))] : 0;
  const baseDice = Math.max(1, Number(profile.dice) || 1);
  const die = /^d(?:4|6|8|10|12)$/.test(String(profile.die)) ? profile.die : "d6";
  const damageType = String(profile.damageType ?? "piercing");
  const ammoFormName = String(form.name ?? "").replace(/ · (?:Esquerda|Direita)$/i, "");
  const ammoState = role === "croma-weapon"
    ? { kind: "magazine", rounds: Number(state.encounter?.cromaAmmo ?? 0), max: Number(profile.capacity ?? 3) }
    : state.encounter?.ammo?.[ammoFormName];
  const pairedHand = String(key).endsWith("direita") ? "right" : String(key).endsWith("esquerda") ? "left" : null;
  const loaded = ammoState?.kind === "pair"
    ? Number(ammoState[pairedHand] ?? 0)
    : Number(ammoState?.rounds ?? profile.capacity ?? 0);
  const awaitingPrepaidStrike = Boolean(state.encounter?.pendingUltimateBonus?.status === "awaiting-strike"
    && state.encounter.pendingUltimateBonus.ammoPrepaid
    && state.encounter.current?.name === ammoFormName);
  const hasAmmunition = !ranged || loaded > 0 || awaitingPrepaidStrike;
  const handsHeld = hasAmmunition ? (profile.hands === 2 ? 2 : 1) : 0;
  const damageLabel = `${baseDice}${die} ${damageTypeLabel(damageType)}`;
  source.name = form.name;
  source.type = "weapon";
  source.system ??= {};
  source.system.slug = slugify(form.name);
  source.system.description = {
    ...(source.system.description ?? {}),
    value: `<p><strong>ARSENAL.EXE · V RedHand</strong></p><p>${form.source ? `${form.source} · ` : ""}${form.meta ?? ""}</p><p><strong>Dano do Strike:</strong> ${damageLabel}. ${striking ? `Luva: runa de striking Mk ${mk};` : ""} Potência +${potency}.</p>${ranged ? `<p><strong>Munição integrada:</strong> ${Math.max(0, loaded)}/${Number(profile.capacity ?? 0)}${awaitingPrepaidStrike ? " · disparo de Ultimate reservado" : ""}</p>` : ""}<p>${form.effect ?? profile.signature ?? ""}</p>${form.wayName ? `<p><strong>${form.wayName}</strong></p>` : ""}<p>${hasAmmunition ? "Forma manifestada e empunhada automaticamente." : "Forma sem munição: recarregue no painel antes de fazer outro Strike."} O PF2e calcula dano, runas e modificadores no Strike.</p>`,
  };
  source.system.category = source.system.category === "unarmed" ? "martial" : (source.system.category ?? "martial");
  source.system.damage = {
    ...(source.system.damage ?? {}),
    // Keep the weapon's printed dice separate from the striking rune rank.
    // PF2e adds the rune dice during damage calculation; pre-adding them here
    // would double the Luva bonus on every Strike.
    dice: baseDice,
    die,
    damageType,
    persistent: null,
  };
  source.system.usage = { ...(source.system.usage ?? {}), value: profile.hands === 2 ? "held-in-two-hands" : "held-in-one-hand" };
  // carryType is intentionally explicit: without "held", PF2e puts a newly
  // created weapon in the inventory as stowed and hides its Strike actions.
  source.system.equipped = { ...(source.system.equipped ?? {}), carryType: hasAmmunition ? "held" : "stowed", handsHeld };
  source.system.range = ranged ? metersToFeet(profile.range ?? 18) : null;
  source.system.group = profile.group ?? (ranged ? "firearm" : "sword");
  source.system.traits ??= { value: [], otherTags: [] };
  // The compendium prototype supplies schema shape only. Traits are fully
  // declared by the V profile to avoid leaking agile/fatal/etc. from templates.
  source.system.traits.value = allowedTraits(profile.traits ?? []);
  source.system.traits.otherTags = [...new Set([...(source.system.traits.otherTags ?? []), "v-redhand"] )];
  source.system.runes = {
    ...(source.system.runes ?? {}),
    potency,
    striking,
    property: source.system.runes?.property ?? [],
  };
  if (ranged) {
    source.system.reload = { ...(source.system.reload ?? {}), value: String(profile.reload?.actions ?? 1) };
    source.system.ammo = {
      ...(source.system.ammo ?? {}),
      builtIn: true,
      baseType: null,
      capacity: Number(profile.capacity ?? 1),
    };
    source.system.expend = 1;
  } else {
    source.system.reload = { ...(source.system.reload ?? {}), value: null };
    source.system.ammo = null;
    source.system.expend = null;
  }
  source.system.quantity = 1;
  source.system.level = { ...(source.system.level ?? {}), value: Math.max(1, Number(actor.system?.details?.level?.value ?? 10)) };
  source.system.traits.rarity = source.system.traits.rarity ?? "unique";
  if (profile.price) source.system.price = profile.price;
  return managedSource(source, role, key);
}

function stateFor(actor) {
  return actor.getFlag?.(MODULE_ID, "state") ?? {};
}

function gloveSource(state) {
  const mk = Math.max(1, Math.min(5, Number(state.gloveMk) || 1));
  const labels = ["Redhand", "RedCoat", "The Dealer", "Blackwall", "Além de Night City"];
  return managedSource({
    name: `Luva Sintonizadora Redhand · Mk ${mk}`,
    type: "equipment",
    img: "systems/pf2e/icons/equipment/held-items/gloves.webp",
    system: {
      slug: `luva-sintonizadora-redhand-mk-${mk}`,
      description: { value: `<p>ARSENAL.EXE · ${labels[mk - 1]}</p><p>Vaso de runas do vínculo. Potência +${[1, 2, 2, 3, 3][mk - 1]}, ${["striking", "striking", "greater striking", "greater striking", "major striking"][mk - 1]}, ${[1, 2, 2, 3, 3][mk - 1]} slots de propriedade.</p><p>As runas acompanham somente a arma manifestada pelo engrama; não se aplicam a Cromas, canhões de braço ou armas de terceiros.</p>` },
      traits: { value: [], otherTags: ["v-redhand"] },
      usage: { value: "worn" },
      quantity: 1,
      bulk: { value: 0 },
      level: { value: 10 },
      price: { value: {} },
      equipped: { carryType: "worn", invested: false },
      rules: [],
    },
  }, "glove", "v-link-glove");
}

function cromaRules(index) {
  const rules = [];
  if (index === 0) rules.push({ key: "FlatModifier", selector: "perception", type: "item", value: 1, label: "Kiroshi Âmbar" });
  if (index === 2) rules.push({ key: "FlatModifier", selector: "initiative", type: "item", value: 1, label: "Kerenzikov" });
  if (index === 6) rules.push({ key: "Resistance", type: "physical", value: 2, label: "Pele de Contrato" });
  if (index === 8) rules.push({ key: "FlatModifier", selector: "fortitude", type: "status", value: 1, predicate: ["item:trait:disease"], label: "Biomonitor" });
  if (index === 11) rules.push({ key: "FlatModifier", selector: "saving-throw", type: "status", value: 2, predicate: [{ or: ["item:trait:mental", "item:trait:illusion"] }], label: "Costura Branca" });
  return rules;
}

async function cromaEquipmentSource(index, defective = false) {
  const croma = cromas[index];
  if (!croma) return null;
  const blueprint = await itemPrototype("equipment", "worn");
  const source = blueprint ?? { name: croma[1], type: "equipment", system: {} };
  source.name = `${croma[0]} · ${croma[1]}${defective ? " · Defeituoso" : ""}`;
  source.type = "equipment";
  source.system ??= {};
  source.system.slug = slugify(`${croma[0]}-${croma[1]}`);
  source.system.description = { ...(source.system.description ?? {}), value: `<p><strong>Croma ${croma[0]} · ${croma[3]} · Peso ${croma[4]}${defective ? " · DEFEITO" : ""}</strong></p><p>${croma[6]}</p>${defective ? "<p>Falha na instalação: defeito pendente de definição/resolução pelo GM.</p>" : ""}<p>Instalado em V RedHand. Efeitos permanentes legíveis ficam como Rules Elements PF2e quando aplicáveis; ações limitadas são controladas na aba Cromas.</p>` };
  source.system.usage = { ...(source.system.usage ?? {}), value: "worn" };
  source.system.equipped = { ...(source.system.equipped ?? {}), carryType: "worn", invested: false };
  source.system.quantity = 1;
  source.system.rules = cromaRules(index);
  source.system.traits ??= { value: [], otherTags: [] };
  source.system.traits.otherTags = [...new Set([...(source.system.traits.otherTags ?? []), "v-redhand-croma"])];
  return managedSource(source, "croma-equipment", String(index));
}

function actionSource(name, description, { type = "action", actions = 1, category = null } = {}) {
  return managedSource({
    name,
    type: "action",
    img: "systems/pf2e/icons/actions/OneAction.webp",
    system: {
      slug: slugify(name),
      description: { value: `<p>${description}</p><p>ARSENAL.EXE · V RedHand. Consulte o painel V para controle de usos e resolução adicional.</p>` },
      traits: { value: [], otherTags: ["v-redhand"] },
      actionType: { value: type },
      actions: { value: type === "action" ? Math.max(1, Math.min(3, actions ?? 1)) : null },
      category,
      frequency: null,
      selfEffect: null,
    },
  }, "v-action", slugify(name));
}

function waySources(wayId) {
  const way = wayProfiles[wayId];
  if (!way) return [];
  return [
    actionSource(way.name, "Esta é a Way ativa da forma manifestada. Ela concede suas opções e ações enquanto V estiver usando essa categoria de arma.", { type: "passive" }),
    actionSource(way.reload, way.reloadText, { actions: 1, category: "interaction" }),
    actionSource(way.initial, way.initialText, { type: way.initialType, actions: 1, category: "defensive" }),
    actionSource(way.advanced, way.advancedText, { type: way.advancedType, actions: way.advancedActions ?? 1, category: "offensive" }),
  ].map(source => managedSource(source, "way-action", `${wayId}:${source.system.slug}`));
}

function specialActionSources(form) {
  const profile = form?.isUltimate ? ultimateProfiles[form.name] : weaponProfileFor(form);
  const baseName = String(form?.name ?? "").replace(/ · (?:Esquerda|Direita)$/i, "");
  const normalEntry = [...weaponsG, ...weaponsS].find(entry => entry[0] === baseName);
  const specialActions = form?.isUltimate
    ? [{
      name: profile?.label ?? `${form.name} · Assinatura Glitch`,
      actions: ultimates.find(entry => entry[1] === form.name)?.[3] ?? 2,
      description: `${profile?.signature ?? form.effect} ${profile?.kind === "strike" ? "Faça o Strike com a arma manifestada; a rolagem PF2e libera o bônus somente após acerto." : `Resolução manual transparente: ${profile?.area ?? "área/alvos conforme carta"}; ${profile?.defense ?? "salvamentos conforme carta"}.`}`,
      kind: profile?.kind === "strike" ? "strike" : "manual-effect",
    }]
    : [
      ...(profile?.specialActions ?? []),
      ...((normalEntry?.[3] ?? form?.effect) ? [{
        name: "Propriedades e técnicas",
        type: "passive",
        description: normalEntry?.[3] ?? form.effect,
        kind: "manual-effect",
      }] : []),
    ];
  return specialActions.map(action => actionSource(
    `${form.name} · ${action.name}`,
    `${action.description}${action.type === "passive" ? " Esta propriedade acompanha a forma manifestada." : action.kind === "strike" || action.kind === "strike-effect" ? " Faça o Strike com a arma manifestada e resolva o efeito pelo resultado mostrado no chat." : " Resolva o efeito descrito com o GM."}`,
    { type: action.type ?? "action", actions: action.actions ?? 1, category: "offensive" },
  )).map(source => managedSource(source, "weapon-action", `${slugify(form.name)}:${source.system.slug}`));
}

async function cromaWeaponSource(index) {
  const croma = cromas[index];
  if (index === 4) {
    return weaponSource({ system: { details: { level: { value: 10 } } }, getFlag: () => ({ gloveMk: 1 }) }, {
      name: "Lâminas de Antebraço · C-05", mode: "S", source: croma[1], meta: "1d6 cortante · agile · finesse", effect: croma[6],
    }, { role: "croma-weapon", key: String(index), runes: false, extra: { mode: "S", hands: 1, dice: 1, die: "d6", damageType: "slashing", range: null, family: "Croma", traits: ["agile", "finesse"] } });
  }
  if (index === 5) {
    return weaponSource({ system: { details: { level: { value: 10 } } }, getFlag: () => ({ gloveMk: 1 }) }, {
      name: "Braço-Canhão · C-06", mode: "G", source: croma[1], meta: "1d10 força · alcance 18 m · capacidade 3", effect: croma[6],
    }, { role: "croma-weapon", key: String(index), runes: false, extra: { mode: "G", hands: 1, dice: 1, die: "d10", damageType: "force", range: 18, capacity: 3, family: "Braço-Canhão", traits: [] } });
  }
  return null;
}

async function desiredItems(actor, state) {
  if (state.active === false) return [];
  const desired = [gloveSource(state)];
  const form = state.encounter?.current;
  if (form && !form.ultimateSelect) {
    if (form.mode === "G" && /^Par\s*[·-]/i.test(form.meta ?? "")) {
      const pairProfile = profileFor(form);
      for (const hand of ["Esquerda", "Direita"]) {
        desired.push(await weaponSource(actor, { ...form, name: `${form.name} · ${hand}` }, {
          role: "manifested-weapon",
          key: `manifested:${hand.toLowerCase()}`,
          extra: { ...pairProfile, family: "Pistola", hands: 1 },
        }));
      }
    } else {
      desired.push(await weaponSource(actor, form));
    }
    desired.push(...waySources(form.wayId));
    desired.push(...specialActionSources(form));
  }
  for (const index of state.daily?.cromas ?? []) {
    const defective = (state.daily?.cromaDefects ?? []).includes(index);
    const equipment = await cromaEquipmentSource(index, defective);
    if (equipment) desired.push(equipment);
    const action = cromaActivation[index + 1];
    if (action) desired.push(actionSource(`Croma ${cromas[index][0]} · ${action.label}`, action.description, { type: action.type ?? "action", actions: action.actions ?? 1, category: "offensive" }));
    const cromaWeapon = await cromaWeaponSource(index);
    if (cromaWeapon) desired.push(cromaWeapon);
  }
  return desired.filter(Boolean);
}

export async function syncVItems(actor, state) {
  const desired = await desiredItems(actor, state);
  const byKey = new Map(desired.map(source => [`${source.flags[MODULE_ID].managedRole}:${source.flags[MODULE_ID].managedKey}`, source]));
  const current = actor.items.filter(item => ownedValue(item, "managedRole"));
  const updates = [];
  const creates = [];
  const stale = [];
  for (const item of current) {
    const role = ownedValue(item, "managedRole");
    const key = ownedValue(item, "managedKey");
    const source = byKey.get(`${role}:${key}`);
    if (!source) {
      stale.push(item.id);
      continue;
    }
    byKey.delete(`${role}:${key}`);
    if (ownedValue(item, "managedSignature") !== source.flags[MODULE_ID].managedSignature) {
      updates.push({ _id: item.id, ...source });
    }
  }
  creates.push(...byKey.values());
  // Add/update the replacement loadout before deleting stale managed items. If
  // either write fails, the existing weapon remains on the Actor for recovery.
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  if (creates.length) await actor.createEmbeddedDocuments("Item", creates);
  if (stale.length) await actor.deleteEmbeddedDocuments("Item", stale);
}

export async function rollManifestedStrike(actor, event, role = "manifested-weapon", key = null) {
  const weapon = actor.items.find(item => ownedValue(item, "managedRole") === role
    && (key === null || ownedValue(item, "managedKey") === String(key)));
  if (!weapon) return false;
  const strike = actor.system.actions?.find(action => action.item?.id === weapon.id || action.itemId === weapon.id);
  const variant = strike?.variants?.[0];
  if (!variant?.roll) return false;
  await variant.roll({ event });
  return true;
}

export function managedWeapon(actor, role = "manifested-weapon") {
  return actor.items.find(item => ownedValue(item, "managedRole") === role) ?? null;
}
