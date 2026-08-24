import { afterEach, describe, expect, it, vi } from "vitest";
import { generateNPCMechanic } from "../../scripts/generators/mechanics/NPCMechanicGenerator.js";
import { analyzePF2eNPC } from "../../scripts/generators/mechanics/PF2eNPCMechanicSource.js";
import {
  GeneratedNPCMechanicService,
  generatedNPCMechanicItemSource,
} from "../../scripts/unique/services/GeneratedNPCMechanicService.js";

type Data = Record<string, unknown>;

class MockItem {
  id: string;
  name: string;
  type: string;
  flags: unknown;
  source: Data;
  constructor(source: Data, id: string) {
    this.id = id;
    this.name = String(source.name ?? "Item");
    this.type = String(source.type ?? "action");
    this.flags = source.flags;
    this.source = structuredClone({ ...source, _id: id });
  }
  toObject(): Data { return structuredClone(this.source); }
}

class MockActor {
  id = "dragon";
  uuid = "Actor.dragon";
  name = "Test Dragon";
  type = "npc";
  system: Data = {
    details: { level: { value: 8 } }, traits: { value: ["dragon", "fire"], size: { value: "large" } },
    attributes: { hp: { value: 160, max: 160 }, ac: { value: 27 }, resistances: [], weaknesses: [], immunities: [] },
    movement: { speeds: { land: { value: 30 } } },
    saves: { fortitude: { value: 20 }, reflex: { value: 17 }, will: { value: 18 } },
  };
  items: MockItem[] = [new MockItem({ name: "Jaws", type: "melee", system: { bonus: { value: 20 }, traits: { value: ["reach-10"] }, damageRolls: { a: { damage: "2d10+8", damageType: "piercing" } } } }, "manual-jaws")];
  flags: Data = { "ethernum-rpg-module": { uniqueMechanics: { activeProfile: "", profiles: {} } } };
  failNextSet = false;
  getFlag(scope: string, key: string): unknown { return (this.flags[scope] as Data | undefined)?.[key]; }
  async setFlag(scope: string, key: string, value: unknown): Promise<unknown> {
    if (this.failNextSet) { this.failNextSet = false; throw new Error("flag failure"); }
    const scoped = (this.flags[scope] as Data | undefined) ?? {};
    this.flags[scope] = { ...scoped, [key]: structuredClone(value) };
    return value;
  }
  async unsetFlag(scope: string, key: string): Promise<void> {
    const scoped = { ...((this.flags[scope] as Data | undefined) ?? {}) };
    delete scoped[key];
    this.flags[scope] = scoped;
  }
  async createEmbeddedDocuments(_name: string, sources: Data[], operation: Data = {}): Promise<MockItem[]> {
    const created = sources.map((source, index) => new MockItem(source, operation.keepId && source._id ? String(source._id) : `generated-${this.items.length + index}`));
    this.items.push(...created);
    return created;
  }
  async deleteEmbeddedDocuments(_name: string, ids: string[]): Promise<void> {
    this.items = this.items.filter(item => !ids.includes(item.id));
  }
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function harness(): { actor: MockActor; service: GeneratedNPCMechanicService } {
  vi.stubGlobal("Actor", MockActor);
  const actor = new MockActor();
  vi.stubGlobal("game", { user: { isGM: true }, actors: [actor] });
  return { actor, service: new GeneratedNPCMechanicService() };
}

function definition(actor: MockActor) {
  return generateNPCMechanic({ analysis: analyzePF2eNPC(actor as never), seed: "service-seed", complexity: "standard" }, 1_000);
}

describe("generated NPC mechanic public service", () => {
  it("creates constrained native PF2e action items once and preserves manual items", async () => {
    const { actor, service } = harness();
    const mechanic = definition(actor);
    const input = { applicationId: `${mechanic.id}:1000`, actorUuid: actor.uuid, definition: mechanic };
    await expect(service.apply(input)).resolves.toMatchObject({ state: "completed" });
    await expect(service.apply(input)).resolves.toMatchObject({ state: "duplicate" });
    expect(actor.items.some(item => item.id === "manual-jaws")).toBe(true);
    const generated = actor.items.filter(item => (item.flags as Data)?.["ethernum-rpg-module"]);
    expect(generated).toHaveLength(2);
    expect(actor.getFlag("ethernum-rpg-module", "uniqueMechanics")).toEqual({ activeProfile: "", profiles: {} });
  });

  it("reverts the latest application without deleting manually authored PF2e items", async () => {
    const { actor, service } = harness();
    const mechanic = definition(actor);
    const applicationId = `${mechanic.id}:1000`;
    await service.apply({ applicationId, actorUuid: actor.uuid, definition: mechanic });
    await expect(service.revert({ revertId: `${applicationId}:revert`, actorUuid: actor.uuid, applicationId })).resolves.toMatchObject({ state: "reverted" });
    expect(actor.items.map(item => item.id)).toEqual(["manual-jaws"]);
    expect(actor.getFlag("ethernum-rpg-module", "generatedNPCMechanic")).toBeUndefined();
  });

  it("requires explicit confirmation for unknown manual flag data and restores it on revert", async () => {
    const { actor, service } = harness();
    await actor.setFlag("ethernum-rpg-module", "generatedNPCMechanic", { customManual: true });
    const mechanic = definition(actor);
    const input = { applicationId: `${mechanic.id}:manual`, actorUuid: actor.uuid, definition: mechanic };
    await expect(service.apply(input)).rejects.toThrow("manual protegida");
    await service.apply({ ...input, replaceManual: true });
    await service.revert({ revertId: `${input.applicationId}:revert`, actorUuid: actor.uuid, applicationId: input.applicationId });
    expect(actor.getFlag("ethernum-rpg-module", "generatedNPCMechanic")).toEqual({ customManual: true });
  });

  it("rolls back newly created items when flag persistence fails", async () => {
    const { actor, service } = harness();
    const mechanic = definition(actor);
    actor.failNextSet = true;
    await expect(service.apply({ applicationId: `${mechanic.id}:failure`, actorUuid: actor.uuid, definition: mechanic })).rejects.toThrow("flag failure");
    expect(actor.items.map(item => item.id)).toEqual(["manual-jaws"]);
    expect(actor.getFlag("ethernum-rpg-module", "generatedNPCMechanic")).toBeUndefined();
  });

  it("renders only constrained PF2e inline operations, never arbitrary macro code", () => {
    const mechanic = definition(harness().actor);
    const component = mechanic.active ?? mechanic.reaction!;
    const source = generatedNPCMechanicItemSource(component, "application-1");
    const content = JSON.stringify(source);
    expect(source.type).toBe("action");
    expect(content).not.toContain("new Function");
    expect(content).not.toContain("eval(");
    expect(content).not.toContain("command");
  });
});
