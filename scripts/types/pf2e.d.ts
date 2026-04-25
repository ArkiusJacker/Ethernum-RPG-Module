/**
 * Interfaces mínimas do sistema PF2E usadas pelo Ethernum.
 * Cobre apenas o que o módulo realmente acessa — sem acoplamento total aos tipos do pf2e.
 */

interface PF2ESkill {
  value: number;
}

interface PF2EAbility {
  mod: number;
}

interface PF2EActorSystem {
  attributes: {
    perception: { value: number };
    hp: { value: number; max: number };
  };
  abilities: Record<string, PF2EAbility>;
}

interface PF2EActor extends Actor {
  system: PF2EActorSystem;
  skills: Record<string, PF2ESkill>;
  /** Fallback legado para percepção em versões antigas do PF2E */
  perception?: { value: number };
}
