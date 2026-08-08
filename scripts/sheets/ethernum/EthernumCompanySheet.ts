export interface CharacterSheetTabDefinition {
  id: string;
  label: string;
  icon: string;
}

export interface CharacterSheetShellDefinition {
  id: "ethernum" | "concordia";
  title: string;
  themeClass: string;
  tabs: (hasSpellcasting: boolean) => CharacterSheetTabDefinition[];
}

export const EthernumCompanyShell: CharacterSheetShellDefinition = {
  id: "ethernum",
  title: "ETHERNUM.CharacterSheet.Ethernum.Title",
  themeClass: "ethernum-company-sheet",
  tabs: hasSpellcasting => [
    { id: "overview", label: "ETHERNUM.CharacterSheet.Tabs.Overview", icon: "fas fa-id-badge" },
    { id: "combat", label: "ETHERNUM.CharacterSheet.Tabs.Combat", icon: "fas fa-swords" },
    { id: "inventory", label: "ETHERNUM.CharacterSheet.Tabs.Equipment", icon: "fas fa-toolbox" },
    ...(hasSpellcasting
      ? [{ id: "spellcasting", label: "ETHERNUM.CharacterSheet.Tabs.Magic", icon: "fas fa-sparkles" }]
      : []),
    { id: "feats", label: "ETHERNUM.CharacterSheet.Tabs.Feats", icon: "fas fa-award" },
    { id: "ether", label: "ETHERNUM.CharacterSheet.Tabs.Ether", icon: "fas fa-bolt" },
    { id: "runes", label: "ETHERNUM.CharacterSheet.Tabs.Runes", icon: "fas fa-gem" },
    { id: "unique", label: "ETHERNUM.CharacterSheet.Tabs.Unique", icon: "fas fa-fingerprint" },
    { id: "effects", label: "ETHERNUM.CharacterSheet.Tabs.Effects", icon: "fas fa-burst" },
  ],
};
