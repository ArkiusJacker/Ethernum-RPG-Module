import { afterEach, describe, expect, it, vi } from "vitest";
import { ContractArchiveService } from "../scripts/contracts/ContractArchiveService.js";

const MODULE_ID = "ethernum-rpg-module";

class FakeJournal {
  id: string;
  uuid: string;
  name: string;
  ownership: Record<string, number>;
  flags: Record<string, Record<string, unknown>>;
  visible = true;
  deleted = false;

  constructor(id: string, data: Record<string, unknown>) {
    this.id = id;
    this.uuid = `JournalEntry.${id}`;
    this.name = String(data.name ?? id);
    this.ownership = { ...(data.ownership as Record<string, number> ?? { default: 0 }) };
    this.flags = structuredClone(data.flags as Record<string, Record<string, unknown>> ?? {});
  }

  getFlag(scope: string, key: string) { return this.flags[scope]?.[key]; }
  async setFlag(scope: string, key: string, value: unknown) {
    this.flags[scope] ??= {};
    this.flags[scope]![key] = structuredClone(value);
  }
  testUserPermission(user: { id?: string; isGM?: boolean }, level: string | number) {
    if (user.isGM) return true;
    const required = level === "OBSERVER" ? 2 : Number(level);
    return Number(this.ownership[user.id ?? ""] ?? this.ownership.default ?? 0) >= required;
  }
  async update(changes: Record<string, unknown>) {
    if (changes.name) this.name = String(changes.name);
    if (changes.ownership) this.ownership = { ...(changes.ownership as Record<string, number>) };
    for (const [key, value] of Object.entries(changes)) {
      const prefix = `flags.${MODULE_ID}.`;
      if (key.startsWith(prefix)) await this.setFlag(MODULE_ID, key.slice(prefix.length), value);
    }
  }
  async delete() { this.deleted = true; }
}

function installWorld(currentIsGM = true) {
  const gm = { id: "gm-a", name: "GM", isGM: true, active: true, character: null };
  const player = { id: "player-a", name: "Player", isGM: false, active: true, character: null };
  const journals: FakeJournal[] = [];
  let sequence = 0;
  vi.stubGlobal("game", { user: currentIsGM ? gm : player, users: [gm, player], journal: journals });
  vi.stubGlobal("JournalEntry", {
    create: vi.fn(async (data: Record<string, unknown>) => {
      const journal = new FakeJournal(`generated-${++sequence}`, data);
      journals.push(journal);
      return journal;
    }),
  });
  vi.stubGlobal("fromUuid", vi.fn(async (uuid: string) => journals.find(journal => journal.uuid === uuid) ?? null));
  return { gm, player, journals };
}

afterEach(() => vi.unstubAllGlobals());

describe("ContractArchiveService", () => {
  it("initializes the archive after this client becomes the primary GM", async () => {
    const { gm, journals } = installWorld(false);
    const service = new ContractArchiveService();
    await service.initialize();
    expect(journals).toHaveLength(0);

    (globalThis.game as unknown as { user: unknown }).user = gm;
    await service.initialize();

    expect(journals.some(journal => journal.getFlag(MODULE_ID, "contractArchiveStore") === true)).toBe(true);
  });

  it("creates a GM-only store and Foundry-authorized projections", async () => {
    const { journals, player } = installWorld(true);
    const service = new ContractArchiveService();
    await service.initialize();

    const store = journals.find(journal => journal.getFlag(MODULE_ID, "contractArchiveStore") === true);
    const contractProjection = journals.find(journal => journal.getFlag(MODULE_ID, "contractArchiveProjection"));
    const reportProjection = journals.find(journal => journal.getFlag(MODULE_ID, "contractDocumentProjection"));
    expect(store?.ownership.default).toBe(0);
    expect(contractProjection?.ownership[player.id]).toBe(2);
    expect(reportProjection?.ownership[player.id]).toBe(2);
    expect(JSON.stringify(contractProjection?.getFlag(MODULE_ID, "contractArchiveProjection"))).not.toContain("visibility");
  });

  it("builds a player snapshot only from observable projections and hides denied attachments", async () => {
    const { journals, player } = installWorld(false);
    journals.push(new FakeJournal("visible-contract", {
      name: "Visible",
      ownership: { default: 0, [player.id]: 2 },
      flags: { [MODULE_ID]: { contractArchiveProjection: { schemaVersion: 1, contract: {
        id: "visible", number: 1, title: "Visible", status: "active", statusLabel: "Ativo", attachments: [], dossiers: [], rewards: [],
      } } } },
    }));
    journals.push(new FakeJournal("visible-report", {
      name: "Report",
      ownership: { default: 0, [player.id]: 2 },
      flags: { [MODULE_ID]: { contractDocumentProjection: {
        schemaVersion: 1,
        contractId: "visible",
        reference: { id: "__report__", label: "Relatório", kind: "pdf", category: "report", icon: "fa-file-pdf" },
        target: { contractId: "visible", attachmentId: "__report__", label: "Relatório", kind: "pdf", category: "report", sourceUrl: "modules/ethernum-rpg-module/assets/contracts/report.pdf" },
      } } },
    }));
    journals.push(new FakeJournal("denied-attachment", {
      name: "Secret annex",
      ownership: { default: 0 },
      flags: { [MODULE_ID]: { contractDocumentProjection: {
        schemaVersion: 1,
        contractId: "visible",
        reference: { id: "secret", label: "GM Secret", kind: "text", category: "attachment", icon: "fa-file" },
        target: { contractId: "visible", attachmentId: "secret", label: "GM Secret", kind: "text", category: "attachment", content: "classified" },
      } } },
    }));

    const service = new ContractArchiveService();
    const snapshot = await service.getSnapshot();
    const serialized = JSON.stringify(snapshot);
    expect(snapshot.contracts[0]?.report?.id).toBe("__report__");
    expect(snapshot.contracts[0]?.attachments).toEqual([]);
    expect(serialized).not.toContain("GM Secret");
    expect(serialized).not.toContain("classified");
    await expect(service.resolveDocumentTarget("visible", "secret")).resolves.toBeNull();
  });

  it("guards all administrative mutations and rejects stale revisions", async () => {
    const world = installWorld(true);
    const service = new ContractArchiveService();
    await service.initialize();
    const archive = await service.getArchive();

    await expect(service.activate("contract-01-operation-manifesto-13", { expectedRevision: archive.revision + 1 }))
      .rejects.toThrow(/atualizado por outro mestre/i);
    (globalThis.game as unknown as { user: unknown }).user = world.player;
    await expect(service.archive("contract-01-operation-manifesto-13")).rejects.toThrow(/Somente o Gamemaster/i);
    await expect(service.activate("contract-01-operation-manifesto-13")).rejects.toThrow(/Somente o Gamemaster/i);
    await expect(service.complete("contract-01-operation-manifesto-13")).rejects.toThrow(/Somente o Gamemaster/i);
    await expect(service.publish({ title: "Forjado" })).rejects.toThrow(/Somente o Gamemaster/i);
    await expect(service.grantAccess("contract-01-operation-manifesto-13", { kind: "user", id: world.player.id })).rejects.toThrow(/Somente o Gamemaster/i);
    await expect(service.revokeAccess("contract-01-operation-manifesto-13", { kind: "user", id: world.player.id })).rejects.toThrow(/Somente o Gamemaster/i);
  });
});
