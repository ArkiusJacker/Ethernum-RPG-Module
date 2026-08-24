import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NPCMechanicAnalysis } from "../../scripts/generators/mechanics/GeneratedNPCMechanicTypes.js";
import { generateNPCMechanic } from "../../scripts/generators/mechanics/NPCMechanicGenerator.js";
import { UniqueMechanicAIAssistanceService } from "../../scripts/generators/mechanics/ai/UniqueMechanicAIAssistanceService.js";
import type { UniqueMechanicAIProvider, UniqueMechanicAISafeInput } from "../../scripts/generators/mechanics/ai/UniqueMechanicAITypes.js";

function analysis(): NPCMechanicAnalysis {
  return {
    actorUuid: "Actor.ai-dragon",
    actorName: "AI Test Dragon",
    level: 9,
    traits: ["dragon", "fire"],
    size: "large",
    speeds: [{ type: "land", value: 30 }, { type: "fly", value: 60 }],
    strikes: [{ name: "Jaws", attackBonus: 21, ranged: false, reach: 10, damageFormula: "2d10+9", damageTypes: ["piercing", "fire"], traits: ["reach-10"] }],
    attackTypes: ["melee"],
    damageTypes: ["piercing", "fire"],
    spellcasting: false,
    resistances: [{ type: "fire", value: 10 }],
    weaknesses: [{ type: "cold", value: 5 }],
    immunities: [],
    actions: ["Breath Weapon"],
    reactions: ["Tail Lash"],
    hp: 180,
    ac: 28,
    saves: { fortitude: 21, reflex: 18, will: 19 },
    roles: [{ role: "brute", weight: 0.4, reasons: ["PV elevado"] }, { role: "boss", weight: 0.3, reasons: ["reação"] }],
    fingerprint: "npc-ai-dragon",
  };
}

function validDraft() {
  return {
    schemaVersion: 1,
    name: "Coração da Caldeira",
    concept: "A pressão dracônica cresce em ciclos legíveis sem alterar o orçamento determinístico.",
    passive: {
      name: "Calor de Pressão",
      summary: "A aura ganha uma apresentação temática mais clara.",
      requirements: "O dragão está consciente.",
      effect: "Use exatamente os limites mecânicos da aura determinística; o calor anuncia visualmente a área afetada.",
    },
    reasoningSummary: ["Preserva custos e operações do rascunho-base."],
    warnings: ["Revisar a descrição com o tom da campanha."],
  };
}

function provider(output: unknown | (() => Promise<unknown>), capture?: (input: UniqueMechanicAISafeInput) => void): UniqueMechanicAIProvider {
  return {
    id: "secure-test-provider",
    label: "Secure Test Proxy",
    model: "test-model-1",
    security: { transport: "secure-server-proxy", exposesClientSecret: false },
    status: () => ({ available: true }),
    generate: async input => {
      capture?.(input);
      return typeof output === "function" ? output() : output;
    },
  };
}

beforeEach(() => vi.stubGlobal("game", { user: { isGM: true } }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("optional unique-mechanic AI assistance", () => {
  it("stays explicitly unavailable without a secure provider", async () => {
    const service = new UniqueMechanicAIAssistanceService();
    const base = generateNPCMechanic({ analysis: analysis(), seed: "offline", complexity: "standard" }, 100);
    expect(service.status()).toMatchObject({ available: false, experimental: true });
    expect(service.status().reason).toMatch(/proxy seguro/i);
    await expect(service.assist(analysis(), base, { mode: "refine" })).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    expect(base.source).toBe("deterministic");
  });

  it("rejects providers that do not declare the secure server-proxy gate", () => {
    const service = new UniqueMechanicAIAssistanceService();
    const unsafe = { ...provider(validDraft()), security: { transport: "secure-server-proxy", exposesClientSecret: true } } as unknown as UniqueMechanicAIProvider;
    expect(() => service.registerProvider(unsafe)).toThrow(/segredo no cliente/i);
  });

  it("sends only the disclosed NPC context and deterministic preview", async () => {
    let captured: UniqueMechanicAISafeInput | undefined;
    const service = new UniqueMechanicAIAssistanceService(() => 1_000);
    service.registerProvider(provider(JSON.stringify(validDraft()), input => { captured = input; }));
    const base = generateNPCMechanic({ analysis: analysis(), seed: "boundary", complexity: "standard" }, 100);
    await service.assist(analysis(), base, { mode: "refine", theme: "forja dracônica", language: "pt-BR" });
    expect(captured?.context.npc.name).toBe("AI Test Dragon");
    expect(captured?.context.request.theme).toBe("forja dracônica");
    const serialized = JSON.stringify(captured);
    expect(serialized).not.toContain("Actor.ai-dragon");
    expect(serialized).not.toContain("npc-ai-dragon");
    expect(serialized).not.toMatch(/journal|conversation|privateNotes|worldExport/i);
  });

  it("rejects invalid JSON and strict-schema violations without changing the base", async () => {
    const base = generateNPCMechanic({ analysis: analysis(), seed: "invalid", complexity: "standard" }, 100);
    const invalidJson = new UniqueMechanicAIAssistanceService(() => 1_000);
    invalidJson.registerProvider(provider("{not-json"));
    await expect(invalidJson.assist(analysis(), base, { mode: "refine" })).rejects.toMatchObject({ code: "INVALID_JSON" });

    const invalidSchema = new UniqueMechanicAIAssistanceService(() => 2_000);
    invalidSchema.registerProvider(provider({ ...validDraft(), script: "eval('no')" }));
    await expect(invalidSchema.assist(analysis(), base, { mode: "refine" })).rejects.toMatchObject({ code: "SCHEMA_FAILURE" });
    expect(base.source).toBe("deterministic");
    expect(invalidSchema.listAudit().at(-1)?.status).toBe("failed");
  });

  it("refines text while preserving every constrained operation and power value", async () => {
    let tick = 1_000;
    const service = new UniqueMechanicAIAssistanceService(() => tick++);
    service.registerProvider(provider(validDraft()));
    const base = generateNPCMechanic({ analysis: analysis(), seed: "valid", complexity: "standard" }, 100);
    const proposal = await service.assist(analysis(), base, { mode: "refine" });
    expect(proposal.assistedDefinition).toMatchObject({ source: "ai-assisted", name: "[TESTE — AI] Coração da Caldeira" });
    expect(proposal.assistedDefinition.metadata).toMatchObject({ origin: "ai-adapter", ai: { providerId: "secure-test-provider", model: "test-model-1", decision: "pending" } });
    expect(proposal.assistedDefinition.metadata.powerBudget).toBe(base.metadata.powerBudget);
    expect(proposal.assistedDefinition.metadata.powerSpent).toBe(base.metadata.powerSpent);
    expect(proposal.assistedDefinition.passive?.operation).toEqual(base.passive?.operation);
    expect(proposal.assistedDefinition.passive?.actionCost).toEqual(base.passive?.actionCost);
  });

  it("records explicit GM acceptance and rejection", async () => {
    let tick = 2_000;
    const service = new UniqueMechanicAIAssistanceService(() => tick++);
    service.registerProvider(provider(validDraft()));
    const base = generateNPCMechanic({ analysis: analysis(), seed: "decision", complexity: "standard" }, 100);
    const acceptedProposal = await service.assist(analysis(), base, { mode: "refine" });
    expect(service.accept(acceptedProposal.proposalId).metadata.ai?.decision).toBe("accepted");
    const rejectedProposal = await service.assist(analysis(), base, { mode: "name" });
    expect(service.reject(rejectedProposal.proposalId)).toEqual(base);
    expect(service.listAudit().map(entry => entry.status)).toEqual(["accepted", "rejected"]);
    expect(service.listAudit().every(entry => entry.generatorVersion === base.metadata.generatorVersion)).toBe(true);
  });

  it("contains provider failures and still leaves deterministic generation usable", async () => {
    const service = new UniqueMechanicAIAssistanceService(() => 3_000);
    service.registerProvider(provider(async () => { throw new Error("proxy offline"); }));
    const base = generateNPCMechanic({ analysis: analysis(), seed: "provider-error", complexity: "standard" }, 100);
    await expect(service.assist(analysis(), base, { mode: "refine" })).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
    expect(generateNPCMechanic({ analysis: analysis(), seed: "provider-error", complexity: "standard" }, 100)).toEqual(base);
    expect(service.listAudit()[0]).toMatchObject({ status: "failed", errorCode: "PROVIDER_ERROR" });
  });

  it("requires a GM even when a provider is available", async () => {
    vi.stubGlobal("game", { user: { isGM: false } });
    const service = new UniqueMechanicAIAssistanceService();
    service.registerProvider(provider(validDraft()));
    const base = generateNPCMechanic({ analysis: analysis(), seed: "player", complexity: "standard" }, 100);
    await expect(service.assist(analysis(), base, { mode: "refine" })).rejects.toMatchObject({ code: "GM_REQUIRED" });
  });
});
