export type PippingDegreeOfSuccess =
  | "criticalFailure"
  | "failure"
  | "success"
  | "criticalSuccess";

export function resolvePippingDegree(
  total: number,
  dc: number,
  natural: number,
): PippingDegreeOfSuccess {
  let rank = total >= dc + 10 ? 3 : total >= dc ? 2 : total <= dc - 10 ? 0 : 1;
  if (natural === 20) rank = Math.min(3, rank + 1);
  if (natural === 1) rank = Math.max(0, rank - 1);
  return (["criticalFailure", "failure", "success", "criticalSuccess"] as const)[rank];
}

export function basicSaveDamage(totalDamage: number, degree: PippingDegreeOfSuccess): number {
  const damage = Math.max(0, Math.floor(totalDamage));
  if (degree === "criticalSuccess") return 0;
  if (degree === "success") return Math.floor(damage / 2);
  if (degree === "criticalFailure") return damage * 2;
  return damage;
}

export function pippingTierGroupOpen(
  groupTier: number,
  activeTier: number,
  hasPendingAction = false,
): boolean {
  return groupTier === activeTier || (hasPendingAction && groupTier <= activeTier);
}
