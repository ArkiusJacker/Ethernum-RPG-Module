import type { CharacterSheetShellDefinition } from "../ethernum/EthernumCompanySheet.js";

export const ConcordiaShell: CharacterSheetShellDefinition = {
  id: "concordia",
  title: "ETHERNUM.CharacterSheet.Concordia.Title",
  themeClass: "concordia-character-sheet",
  theme: {
    id: "concordia",
    shellClass: "concordia-character-sheet",
    accent: "arcane",
    density: "comfortable",
    componentVariants: {
      header: "arcane-register",
      combat: "tactical-grimoire",
      inventory: "field-arsenal",
    },
  },
  tabs: hasSpellcasting => [
    { id: "overview", label: "ETHERNUM.CharacterSheet.Tabs.Character", icon: "fas fa-user" },
    { id: "combat", label: "ETHERNUM.CharacterSheet.Tabs.Combat", icon: "fas fa-swords" },
    { id: "inventory", label: "ETHERNUM.CharacterSheet.Tabs.Arsenal", icon: "fas fa-shield-halved" },
    ...(hasSpellcasting
      ? [{ id: "spellcasting", label: "ETHERNUM.CharacterSheet.Tabs.Magic", icon: "fas fa-wand-sparkles" }]
      : []),
    { id: "feats", label: "ETHERNUM.CharacterSheet.Tabs.Feats", icon: "fas fa-award" },
    { id: "unique", label: "ETHERNUM.CharacterSheet.Tabs.Unique", icon: "fas fa-fingerprint" },
    { id: "effects", label: "ETHERNUM.CharacterSheet.Tabs.Effects", icon: "fas fa-burst" },
  ],
};
