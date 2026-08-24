import type {
  NPCMechanicAnalysis,
  NPCMechanicRole,
  NPCMechanicRoleWeight,
} from "./GeneratedNPCMechanicTypes.js";

interface MutableRole {
  score: number;
  reasons: string[];
}

const ROLE_ORDER: NPCMechanicRole[] = [
  "brute", "skirmisher", "controller", "artillery", "defender", "support", "caster", "boss",
];

function textIncludes(values: readonly string[], patterns: readonly string[]): boolean {
  const haystack = values.join(" ").toLowerCase();
  return patterns.some(pattern => haystack.includes(pattern));
}

export function classifyNPCRoles(analysis: Omit<NPCMechanicAnalysis, "roles">): NPCMechanicRoleWeight[] {
  const scores = Object.fromEntries(ROLE_ORDER.map(role => [role, { score: 1, reasons: [] as string[] }])) as unknown as Record<Exclude<NPCMechanicRole, "hybrid">, MutableRole>;
  const add = (role: Exclude<NPCMechanicRole, "hybrid">, score: number, reason: string): void => {
    scores[role].score += score;
    scores[role].reasons.push(reason);
  };
  const names = [...analysis.actions, ...analysis.reactions];
  const strikeTraits = analysis.strikes.flatMap(strike => strike.traits);
  const maximumSpeed = Math.max(0, ...analysis.speeds.map(speed => speed.value));
  const rangedStrikes = analysis.strikes.filter(strike => strike.ranged).length;
  const meleeStrikes = analysis.strikes.length - rangedStrikes;
  const maximumAttack = Math.max(0, ...analysis.strikes.map(strike => strike.attackBonus));

  if (meleeStrikes > 0) add("brute", 2, "possui ataques corpo a corpo");
  if (analysis.hp >= Math.max(30, analysis.level * 18)) add("brute", 3, "PV elevado para o nível");
  if (maximumAttack >= analysis.level + 10) add("brute", 1, "ataque principal elevado");
  if (maximumSpeed > 25) add("skirmisher", 3, "deslocamento acima de 25 pés");
  if (textIncludes(strikeTraits, ["agile", "finesse", "backswing"])) add("skirmisher", 2, "traits de ataque móvel");
  if (analysis.saves.reflex >= Math.max(analysis.saves.fortitude, analysis.saves.will)) add("skirmisher", 1, "Reflexos é a defesa dominante");
  if (textIncludes(names, ["grab", "grapple", "trip", "push", "aura", "zone", "control", "prender", "derrubar"])) add("controller", 4, "ações de controle detectadas");
  if (analysis.strikes.some(strike => strike.reach > 10)) add("controller", 2, "alcance corporal extenso");
  if (rangedStrikes > 0) add("artillery", 3, "ataque à distância detectado");
  if (rangedStrikes > meleeStrikes) add("artillery", 2, "predominância de ataques à distância");
  if (analysis.ac >= analysis.level + 17) add("defender", 3, "CA elevada para o nível");
  if (analysis.resistances.length + analysis.immunities.length > 0) add("defender", 2, "resistências ou imunidades presentes");
  if (analysis.reactions.length > 0) add("defender", 1, "reação defensiva possível");
  if (textIncludes(names, ["heal", "restore", "aid", "bless", "ward", "cura", "restaur", "proteger"])) add("support", 5, "ações de suporte detectadas");
  if (analysis.spellcasting) add("caster", 6, "conjuração detectada");
  if (analysis.saves.will > analysis.saves.fortitude && analysis.spellcasting) add("caster", 1, "Vontade e conjuração favorecem papel mágico");
  if (analysis.traits.includes("unique")) add("boss", 8, "trait unique");
  if (analysis.traits.includes("elite")) add("boss", 4, "ajuste elite");
  if (analysis.actions.length >= 3 && analysis.reactions.length > 0) add("boss", 2, "economia de ações ampla");

  const total = Object.values(scores).reduce((sum, entry) => sum + entry.score, 0);
  const roles: NPCMechanicRoleWeight[] = ROLE_ORDER.map(role => ({
    role,
    weight: Number((scores[role as Exclude<NPCMechanicRole, "hybrid">].score / total).toFixed(3)),
    reasons: scores[role as Exclude<NPCMechanicRole, "hybrid">].reasons,
  })).sort((left, right) => right.weight - left.weight || left.role.localeCompare(right.role));
  const first = roles[0];
  const second = roles[1];
  if (first && second && first.role !== "boss" && Math.abs(first.weight - second.weight) <= 0.05) {
    roles.push({
      role: "hybrid",
      weight: Number(((first.weight + second.weight) / 2).toFixed(3)),
      reasons: [`equilíbrio entre ${first.role} e ${second.role}`],
    });
    roles.sort((left, right) => right.weight - left.weight || left.role.localeCompare(right.role));
  }
  return roles;
}
