import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ETHERNUM } from "../scripts/config.js";
import {
  arkiusProfile,
  atlasProfile,
  bayleProfile,
  charlesProfile,
  collectManagedMacroDefinitions,
  gyroProfile,
  pippingProfile,
  yuProfile,
} from "../scripts/mechanics/registry.js";
import type { ManagedMacroDefinition, UniqueMechanicProfile } from "../scripts/mechanics/types.js";

const SPINBALL_IMAGE = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/spinball.png`;
const ARKIUS_IMAGE = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/concordia/arkius-icon.png`;

const expectedByProfile: ReadonlyArray<readonly [UniqueMechanicProfile, ManagedMacroDefinition[]]> = [
  [gyroProfile, [{
    id: "gyro-techniques",
    name: "Ethernum - Gyro: Técnicas",
    command: "await game.ethernum.macros.ethernumCompany.gyro.showTechniques();",
    img: SPINBALL_IMAGE,
  }]],
  [bayleProfile, [{
    id: "bayle-status",
    name: "Ethernum - Bayle: Painel",
    command: "await game.ethernum.macros.ethernumCompany.bayle.showStatus();",
    img: SPINBALL_IMAGE,
  }]],
  [pippingProfile, [
    {
      id: "pipping-status",
      name: "Ethernum - Pipping: Painel",
      command: "await game.ethernum.macros.ethernumCompany.pipping.showStatus();",
      img: "icons/magic/unholy/orb-glowing-purple.webp",
    },
    {
      id: "pipping-living-night",
      name: "Ethernum - Pipping: Ativar Noite Viva",
      command: "await game.ethernum.macros.ethernumCompany.pipping.activateLivingNight();",
      img: "icons/magic/unholy/barrier-shield-glowing-pink.webp",
    },
    {
      id: "pipping-commune-night",
      name: "Ethernum - Pipping: Comungar com a Noite",
      command: "await game.ethernum.macros.ethernumCompany.pipping.communeWithNight();",
      img: "icons/magic/time/hourglass-brown-purple.webp",
    },
    {
      id: "pipping-configure-darkness",
      name: "Ethernum - Pipping: Configurar Escuridão",
      command: "await game.ethernum.macros.ethernumCompany.pipping.configureDarkness();",
      img: "icons/magic/unholy/silhouette-robe-evil-power.webp",
    },
  ]],
  [arkiusProfile, [
    ["concordia-arkius-status", "Ethernum - Concórdia: Arkius Painel", "showStatus"],
    ["arkius-nucleo-em-brasas", "Ethernum - Arkius: Núcleo em Brasas", "toggleNucleoEmBrasas"],
    ["arkius-sintonia-fluxo", "Ethernum - Arkius: Fluxo", "setSintoniaFluxo"],
    ["arkius-sintonia-brasas", "Ethernum - Arkius: Brasas", "setSintoniaBrasas"],
    ["arkius-exaurir-o-sol", "Ethernum - Arkius: Exaurir o Sol", "exaurirOSol"],
    ["arkius-kinetic-aura", "Ethernum - Arkius: Aura Cinética", "toggleKineticAura"],
    ["arkius-thermal-nimbus", "Ethernum - Arkius: Thermal Nimbus", "toggleThermalNimbus"],
    ["arkius-resiliencia-reativa", "Ethernum - Arkius: Resiliência Reativa", "resilienciaReativa"],
    ["arkius-short-rest", "Ethernum - Arkius: Descanso Curto", "shortRestReset"],
    ["arkius-long-rest", "Ethernum - Arkius: Descanso Longo", "longRestReset"],
  ].map(([id, name, method]) => ({
    id,
    name,
    command: `await game.ethernum.macros.concordia.arkius.${method}();`,
    img: ARKIUS_IMAGE,
  }))],
  [yuProfile, [
    ["concordia-yu-status", "Ethernum - Yu: Painel", "showStatus"],
    ["yu-rage-in-the-flesh", "Ethernum - Yu: Rage in the Flesh", "toggleRage"],
    ["yu-flurry-of-blows", "Ethernum - Yu: Flurry of Blows", "flurryOfBlows"],
    ["yu-flurry-fear", "Ethernum - Yu: Sobrecarga de Medo", "flurryFear"],
    ["yu-stunning-fist-damage", "Ethernum - Yu: Stunning Fist +2d10", "stunningFistDamage"],
  ].map(([id, name, method]) => ({
    id,
    name,
    command: `await game.ethernum.macros.concordia.yu.${method}();`,
    img: "icons/svg/terror.svg",
  }))],
  [charlesProfile, [
    ["concordia-charles-status", "Ethernum - Charles: Painel", "showStatus"],
    ["charles-impulse-climb", "Ethernum - Charles: Escalada de Impulso", "impulseClimb"],
    ["charles-containment-shot", "Ethernum - Charles: Disparo de Contenção", "containmentShot"],
    ["charles-vector-pull", "Ethernum - Charles: Puxão Vetorial", "vectorPull"],
    ["charles-cushioning-net", "Ethernum - Charles: Rede de Amortecimento", "cushioningNet"],
    ["charles-craft-imagination", "Ethernum - Charles: Craft da Imaginação", "craftImagination"],
  ].map(([id, name, method]) => ({
    id,
    name,
    command: `await game.ethernum.macros.concordia.charles.${method}();`,
    img: "icons/svg/hammer.svg",
  }))],
  [atlasProfile, [
    ["concordia-atlas-status", "Ethernum - Atlas: Painel", "showStatus"],
    ["atlas-olhar-do-divino", "Ethernum - Atlas: Olhar do Divino", "olharDoDivino"],
    ["atlas-complete-divine-gaze", "Ethernum - Atlas: Concluir Olhar", "completeDivineGaze"],
  ].map(([id, name, method]) => ({
    id,
    name,
    command: `await game.ethernum.macros.concordia.atlas.${method}();`,
    img: "icons/svg/sword.svg",
  }))],
];

describe("managed macro profile source", () => {
  it.each(expectedByProfile)("preserves every definition from profile %s", (profile, expected) => {
    expect(profile.getManagedMacros()).toStrictEqual(expected);
  });

  it("collects all character macros once and in registry order", () => {
    const expected = expectedByProfile.flatMap(([, definitions]) => definitions);
    const collected = collectManagedMacroDefinitions();
    expect(collected).toStrictEqual(expected);
    expect(collected).toHaveLength(30);
    expect(new Set(collected.map(definition => definition.id)).size).toBe(collected.length);
  });

  it("copies optional legacy aliases without dropping or sharing them", () => {
    const legacyNames = ["Ethernum - Gyro: Tecnicas"];
    const legacyCommands = ["await game.ethernum.macros.showGyroTechniques();"];
    const spy = vi.spyOn(gyroProfile, "getManagedMacros").mockReturnValue([{
      ...expectedByProfile[0][1][0],
      legacyNames,
      legacyCommands,
    }]);

    const definition = collectManagedMacroDefinitions()[0];
    expect(definition.legacyNames).toStrictEqual(legacyNames);
    expect(definition.legacyCommands).toStrictEqual(legacyCommands);
    expect(definition.legacyNames).not.toBe(legacyNames);
    expect(definition.legacyCommands).not.toBe(legacyCommands);
    spy.mockRestore();
  });

  it("keeps only universal macros centralized and preserves public API aliases", () => {
    const source = readFileSync(join(process.cwd(), "scripts", "main.ts"), "utf8");
    expect(source).toContain("collectManagedMacroDefinitions()");
    expect(source).toContain("COMBAT_MOMENTUM_MANAGED_MACROS");
    expect(source).not.toMatch(/const (GYRO|BAYLE|PIPPING|ARKIUS|YU|CHARLES|ATLAS)_MANAGED_MACROS/);
    expect(source).toContain("showTechniques: api.showGyroTechniques");
    expect(source).toContain("showStatus: api.showBayleStatus");
    expect(source).toContain("showStatus: api.showPippingStatus");
  });
});
