import type { PippingExpression } from "./state.js";

export const PIPPING_SHADOW_ASSETS: Readonly<Record<PippingExpression, string>> = {
  destruction: "modules/ethernum-rpg-module/assets/unique/pipping/shadow-destruction.png",
  order: "modules/ethernum-rpg-module/assets/unique/pipping/shadow-order.png",
  chaos: "modules/ethernum-rpg-module/assets/unique/pipping/shadow-chaos.png",
};

export interface PippingShadowVariant {
  expression: PippingExpression;
  asset: string;
}

export const PIPPING_SHADOW_VARIANTS: readonly PippingShadowVariant[] = (
  Object.entries(PIPPING_SHADOW_ASSETS) as Array<[PippingExpression, string]>
).map(([expression, asset]) => ({ expression, asset }));

export function selectPippingShadowVariant(
  random: () => number = Math.random,
): PippingShadowVariant {
  const roll = Math.max(0, Math.min(0.999999999, Number(random()) || 0));
  const index = Math.floor(roll * PIPPING_SHADOW_VARIANTS.length);
  return PIPPING_SHADOW_VARIANTS[index] ?? PIPPING_SHADOW_VARIANTS[0];
}
