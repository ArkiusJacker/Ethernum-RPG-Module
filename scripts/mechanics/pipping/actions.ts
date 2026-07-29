export function getPippingActionFormula(
  formulaId: string | undefined,
  level: number,
  charismaModifier: number,
  tier: number,
): string | null {
  const scaledOddLevelDice = (base: number, startingLevel: number) =>
    base + Math.max(0, Math.floor((Math.max(startingLevel, level) - startingLevel) / 2));
  const signedCharisma = charismaModifier >= 0 ? ` + ${charismaModifier}` : ` - ${Math.abs(charismaModifier)}`;

  switch (formulaId) {
    case "ruin-note":
    case "restoring-pulse":
      return `${scaledOddLevelDice(2, 3)}d6${formulaId === "restoring-pulse" ? signedCharisma : ""}`;
    case "void-touch":
      return `${scaledOddLevelDice(4, 5)}d6`;
    case "black-order-mantle":
      return `${Math.ceil(level / 2) + charismaModifier}`;
    case "night-emanation":
      return `${tier >= 5 ? 10 : tier >= 4 ? 8 : 6}d6`;
    case "requiem-persist":
      return `${level >= 17 ? 5 : level >= 13 ? 4 : 3}d8${signedCharisma}`;
    case "ending-chorus":
      return "10d6";
    case "gentle-night-liturgy":
      return `6d8${signedCharisma}`;
    case "dead-sun-epitaph":
      return "14d6";
    case "night-refuses-end":
      return `8d8${signedCharisma}`;
    default:
      return null;
  }
}
