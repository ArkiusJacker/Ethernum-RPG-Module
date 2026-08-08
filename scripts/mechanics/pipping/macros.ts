import type { ManagedMacroDefinition } from "../types.js";

export const PIPPING_MANAGED_MACROS = [
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
] satisfies readonly ManagedMacroDefinition[];

export function getPippingManagedMacros(): ManagedMacroDefinition[] {
  return PIPPING_MANAGED_MACROS.map(definition => ({ ...definition }));
}
