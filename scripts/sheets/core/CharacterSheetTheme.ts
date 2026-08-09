export interface CharacterSheetThemeDefinition {
  id: string;
  shellClass: string;
  accent?: string;
  density?: "comfortable" | "compact";
  componentVariants?: Record<string, string>;
}

export interface CharacterQuickViewSnapshot {
  identity: unknown;
  vitals: unknown;
  defenses: unknown;
  quickActions: unknown[];
  resources: unknown[];
  uniqueStatus?: unknown;
}
