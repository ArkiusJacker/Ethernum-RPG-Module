import { describe, expect, it } from "vitest";
import {
  OFFICIAL_FIELD_COMMUNICATOR_APPS,
  addFieldCommunicatorApp,
  createDefaultFieldCommunicatorRegistry,
  disableFieldCommunicatorApp,
  duplicateFieldCommunicatorApp,
  editFieldCommunicatorApp,
  exportFieldCommunicatorRegistry,
  filterFieldCommunicatorApps,
  importFieldCommunicatorRegistry,
  normalizeFieldCommunicatorRegistry,
  removeFieldCommunicatorApp,
  reorderFieldCommunicatorApps,
  resetFieldCommunicatorRegistry,
  stableSortFieldCommunicatorApps,
} from "../scripts/communicator/FieldCommunicatorRegistry.js";
import {
  FIELD_COMMUNICATOR_APP_VERSION,
  FIELD_COMMUNICATOR_SCHEMA_VERSION,
  OFFICIAL_FIELD_COMMUNICATOR_APP_IDS,
  type FieldCommunicatorApp,
} from "../scripts/communicator/FieldCommunicatorTypes.js";

function customApp(index: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: FIELD_COMMUNICATOR_APP_VERSION,
    id: `custom-${index}`,
    source: "custom",
    label: `Custom ${index}`,
    description: `Description ${index}`,
    icon: "fa-solid fa-file",
    type: "document",
    targetUuid: `JournalEntry.target-${index}`,
    order: 200 + index,
    enabled: true,
    ...overrides,
  };
}

describe("FieldCommunicatorRegistry", () => {
  it("creates the complete official catalog with stable ids and versions", () => {
    const registry = createDefaultFieldCommunicatorRegistry();

    expect(registry.schemaVersion).toBe(FIELD_COMMUNICATOR_SCHEMA_VERSION);
    expect(registry.apps.map((app) => app.id)).toEqual(OFFICIAL_FIELD_COMMUNICATOR_APP_IDS);
    expect(registry.apps.every((app) => app.source === "official")).toBe(true);
    expect(registry.apps.every((app) => app.version === FIELD_COMMUNICATOR_APP_VERSION)).toBe(true);
  });

  it("migrates legacy collections and preserves unknown registry and app fields", () => {
    const registry = normalizeFieldCommunicatorRegistry({
      version: 1,
      futureRegistryField: { retained: true },
      customApps: [{
        id: " Legacy Reports ",
        label: "Relatórios",
        description: "Arquivo legado",
        icon: "reports.svg",
        type: "journal",
        targetUuid: "JournalEntry.legacy",
        minRank: 3,
        order: "91",
        enabled: true,
        futureAppField: { retained: "yes" },
      }],
    });

    expect(registry.futureRegistryField).toEqual({ retained: true });
    expect(registry.apps.find((app) => app.id === "legacy-reports")).toMatchObject({
      version: FIELD_COMMUNICATOR_APP_VERSION,
      type: "document",
      targetUuid: "JournalEntry.legacy",
      minimumRank: 3,
      order: 91,
      futureAppField: { retained: "yes" },
    });
  });

  it("sanitizes user-controlled fields without losing a broken UUID", () => {
    const registry = normalizeFieldCommunicatorRegistry({
      apps: [{
        id: "  Relatórios !!! ",
        label: "<b>Relatórios</b>\u0000 especiais",
        description: "<img src=x onerror=alert(1)> Registros   internos",
        icon: "javascript:alert(1)",
        type: "document",
        targetUuid: "Broken.Document.UUID.value",
        accent: "red; background:url(javascript:1)",
        order: -500,
        enabled: true,
      }],
    });
    const app = registry.apps.find((entry) => entry.id === "relatorios");

    expect(app).toMatchObject({
      label: "Relatórios especiais",
      description: "Registros internos",
      icon: "fa-solid fa-grid-2",
      type: "document",
      targetUuid: "Broken.Document.UUID.value",
      order: 0,
    });
    expect(app?.accent).toBeUndefined();
  });

  it("only accepts http/https links represented as external apps", () => {
    const imported = importFieldCommunicatorRegistry({
      apps: [
        customApp(1, { type: "external", targetUrl: "https://ethernum.example/archive" }),
        customApp(2, { type: "external", targetUrl: "javascript:alert(1)" }),
        customApp(3, { type: "external", targetUrl: "data:text/html,boom" }),
        customApp(4, { type: "document", targetUuid: "https://unsafe.example" }),
      ],
    });

    expect(imported.rejectedCount).toBe(2);
    expect(imported.registry.apps.find((app) => app.id === "custom-1")?.targetUrl)
      .toBe("https://ethernum.example/archive");
    expect(imported.registry.apps.find((app) => app.id === "custom-4")?.targetUuid).toBeUndefined();
    expect(imported.registry.apps.some((app) => app.targetUrl?.startsWith("javascript:"))).toBe(false);
  });

  it("rejects malicious imports and strips executable or prototype-polluting fields", () => {
    const payload = `{
      "schemaVersion": 1,
      "__proto__": { "polluted": true },
      "apps": [
        {
          "id": "safe-app",
          "label": "<script>alert(1)</script> Safe",
          "description": "Description",
          "icon": "fa-solid fa-file",
          "type": "document",
          "targetUuid": "JournalEntry.safe",
          "order": 1,
          "enabled": true,
          "onClick": "alert(1)",
          "script": "game.actors.clear()",
          "future": { "handler": "evil", "kept": true }
        },
        {
          "id": "evil-app",
          "label": "Evil",
          "type": "javascript",
          "targetUrl": "javascript:alert(1)"
        }
      ]
    }`;
    const result = importFieldCommunicatorRegistry(payload);
    const safe = result.registry.apps.find((app) => app.id === "safe-app");

    expect(result.rejectedCount).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(safe?.label).toBe("alert(1) Safe");
    expect(safe).not.toHaveProperty("onClick");
    expect(safe).not.toHaveProperty("script");
    expect(safe?.future).toEqual({ kept: true });
    expect(result.registry).not.toHaveProperty("__proto__.polluted");
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("filters enabled apps by minimum rank and agent/squad allowlists", () => {
    const registry = normalizeFieldCommunicatorRegistry({
      apps: [
        customApp(1, { minimumRank: 2 }),
        customApp(2, { minimumRank: 5 }),
        customApp(3, { allowedAgents: ["agent-a"] }),
        customApp(4, { allowedSquads: ["squad-blue"] }),
        customApp(5, { allowedAgents: ["agent-b"], allowedSquads: ["squad-red"] }),
        customApp(6, { enabled: false }),
      ],
    });
    const visible = filterFieldCommunicatorApps(registry.apps, {
      rank: 3,
      agentId: "agent-a",
      squadIds: ["squad-blue"],
    }).map((app) => app.id);

    expect(visible).toContain("custom-1");
    expect(visible).not.toContain("custom-2");
    expect(visible).toContain("custom-3");
    expect(visible).toContain("custom-4");
    expect(visible).not.toContain("custom-5");
    expect(visible).not.toContain("custom-6");
  });

  it("uses OR semantics between agent and squad restrictions", () => {
    const app = normalizeFieldCommunicatorRegistry({
      apps: [customApp(1, {
        allowedAgents: ["agent-a"],
        allowedSquads: ["squad-red"],
      })],
    }).apps.find((entry) => entry.id === "custom-1")!;

    expect(filterFieldCommunicatorApps([app], { agentId: "agent-a" })).toEqual([app]);
    expect(filterFieldCommunicatorApps([app], { squadIds: ["squad-red"] })).toEqual([app]);
    expect(filterFieldCommunicatorApps([app], { agentId: "agent-b", squadIds: ["squad-blue"] }))
      .toEqual([]);
  });

  it("sorts equal orders stably and never mutates the source array", () => {
    const apps = [
      customApp(1, { order: 5 }),
      customApp(2, { order: 1 }),
      customApp(3, { order: 5 }),
      customApp(4, { order: 5 }),
    ].map((app) => normalizeFieldCommunicatorRegistry({ apps: [app] }).apps
      .find((entry) => entry.id === app.id)!) as FieldCommunicatorApp[];
    const originalOrder = apps.map((app) => app.id);

    expect(stableSortFieldCommunicatorApps(apps).map((app) => app.id))
      .toEqual(["custom-2", "custom-1", "custom-3", "custom-4"]);
    expect(apps.map((app) => app.id)).toEqual(originalOrder);
  });

  it("supports pure GM add, edit, duplicate, reorder, disable and remove operations", () => {
    const initial = createDefaultFieldCommunicatorRegistry();
    const added = addFieldCommunicatorApp(initial, customApp(1));
    const edited = editFieldCommunicatorApp(added, "custom-1", {
      label: "Updated",
      accent: "#12aabb",
    });
    const duplicated = duplicateFieldCommunicatorApp(edited, "custom-1");
    const reordered = reorderFieldCommunicatorApps(duplicated, ["custom-1-copy", "custom-1", "sheet"]);
    const disabled = disableFieldCommunicatorApp(reordered, "custom-1");
    const removed = removeFieldCommunicatorApp(disabled, "custom-1-copy");

    expect(initial.apps).toHaveLength(OFFICIAL_FIELD_COMMUNICATOR_APPS.length);
    expect(edited.apps.find((app) => app.id === "custom-1")).toMatchObject({
      label: "Updated",
      accent: "#12aabb",
    });
    expect(duplicated.apps.some((app) => app.id === "custom-1-copy")).toBe(true);
    expect(reordered.apps.slice(0, 3).map((app) => app.id))
      .toEqual(["custom-1-copy", "custom-1", "sheet"]);
    expect(disabled.apps.find((app) => app.id === "custom-1")?.enabled).toBe(false);
    expect(removed.apps.some((app) => app.id === "custom-1-copy")).toBe(false);
  });

  it("keeps official ids and routes immutable while allowing presentation edits", () => {
    const registry = editFieldCommunicatorApp(createDefaultFieldCommunicatorRegistry(), "sheet", {
      id: "renamed-sheet",
      type: "external",
      targetUrl: "https://example.com",
      label: "Ficha de Campo",
      enabled: false,
    });
    const sheet = registry.apps.find((app) => app.id === "sheet");

    expect(sheet).toMatchObject({
      id: "sheet",
      source: "official",
      type: "internal",
      internalTarget: "sheet",
      label: "Ficha de Campo",
      enabled: false,
    });
    expect(removeFieldCommunicatorApp(registry, "sheet").apps.some((app) => app.id === "sheet"))
      .toBe(true);
  });

  it("resets official configuration and optionally preserves custom apps", () => {
    const customized = addFieldCommunicatorApp(
      editFieldCommunicatorApp(createDefaultFieldCommunicatorRegistry(), "map", {
        label: "Mapa alterado",
        enabled: false,
        order: 999,
      }),
      customApp(1),
    );

    const preserved = resetFieldCommunicatorRegistry(customized);
    const cleared = resetFieldCommunicatorRegistry(customized, { preserveCustomApps: false });
    expect(preserved.apps.find((app) => app.id === "map")).toMatchObject({
      label: "Mapa",
      enabled: true,
      order: 40,
    });
    expect(preserved.apps.some((app) => app.id === "custom-1")).toBe(true);
    expect(cleared.apps.some((app) => app.source === "custom")).toBe(false);
  });

  it("round-trips versioned exports while preserving extensions", () => {
    const registry = normalizeFieldCommunicatorRegistry({
      schemaVersion: 8,
      futureRegistry: "kept",
      apps: [customApp(1, { version: 4, futureApp: [1, 2, 3] })],
    });
    const imported = importFieldCommunicatorRegistry(exportFieldCommunicatorRegistry(registry));

    expect(imported.registry.schemaVersion).toBe(8);
    expect(imported.registry.futureRegistry).toBe("kept");
    expect(imported.registry.apps.find((app) => app.id === "custom-1")).toMatchObject({
      version: 4,
      futureApp: [1, 2, 3],
    });
  });

  it("never resolves, updates or deletes the target document during GM operations", () => {
    const targetDocument = Object.freeze({
      uuid: "JournalEntry.protected-target",
      delete: () => { throw new Error("must not be called"); },
      update: () => { throw new Error("must not be called"); },
    });
    const initial = addFieldCommunicatorApp(createDefaultFieldCommunicatorRegistry(), customApp(1, {
      targetUuid: targetDocument.uuid,
    }));
    const edited = editFieldCommunicatorApp(initial, "custom-1", { label: "Only the shortcut" });
    const duplicated = duplicateFieldCommunicatorApp(edited, "custom-1");
    const removed = removeFieldCommunicatorApp(duplicated, "custom-1");

    expect(edited.apps.find((app) => app.id === "custom-1")?.targetUuid).toBe(targetDocument.uuid);
    expect(duplicated.apps.find((app) => app.id === "custom-1-copy")?.targetUuid)
      .toBe(targetDocument.uuid);
    expect(removed.apps.some((app) => app.id === "custom-1")).toBe(false);
    expect(targetDocument.uuid).toBe("JournalEntry.protected-target");
  });

  it.each([8, 16, 30, 60])("normalizes, filters and orders %i custom apps", (count) => {
    const registry = normalizeFieldCommunicatorRegistry({
      apps: Array.from({ length: count }, (_, index) => customApp(index, {
        order: count - index,
        minimumRank: index % 3,
        enabled: index % 5 !== 0,
      })),
    });
    const visible = filterFieldCommunicatorApps(registry.apps, { rank: 2 });
    const customVisible = visible.filter((app) => app.source === "custom");

    expect(registry.apps.filter((app) => app.source === "custom")).toHaveLength(count);
    expect(customVisible).toHaveLength(count - Math.ceil(count / 5));
    expect(visible.map((app) => app.order)).toEqual(
      visible.map((app) => app.order).slice().sort((left, right) => left - right),
    );
  });
});
