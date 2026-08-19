import { describe, expect, it } from "vitest";
import {
  UIAssetPackRegistry,
  parseUIAssetNamespace,
  resolveUIAsset,
  resolveUIAssetPack,
  resolveUIAssetPath,
} from "../scripts/ui/assets/UIAssetPackRegistry.js";

describe("UIAssetPackRegistry", () => {
  it("resolves the canonical Ethernum pack through the shared namespace", () => {
    expect(UIAssetPackRegistry.namespaces).toEqual(["ETH", "CON", "COM"]);
    expect(resolveUIAssetPack("eth")).toMatchObject({ namespace: "ETH", version: 1, status: "canonical" });
    expect(resolveUIAsset("eth-ui-03")?.id).toBe("ETH-UI-03");
    expect(resolveUIAssetPath("ETH-UI-03")).toContain("rank-ring.webp");
  });

  it("keeps Concordia and Communicator slots explicit without invented assets", () => {
    for (const namespace of ["CON", "COM"] as const) {
      expect(resolveUIAssetPack(namespace)).toEqual({
        namespace,
        version: 0,
        status: "awaiting-canonical-assets",
        assets: [],
      });
    }
    expect(resolveUIAsset("COM-UI-01")).toBeUndefined();
    expect(resolveUIAssetPath("COM-UI-01")).toBe("");
  });

  it("parses only supported asset namespaces", () => {
    expect(parseUIAssetNamespace(" com-ui-02 ")).toBe("COM");
    expect(parseUIAssetNamespace("CON-UI-04")).toBe("CON");
    expect(parseUIAssetNamespace("OTHER-UI-01")).toBeNull();
    expect(parseUIAssetNamespace(null)).toBeNull();
  });
});
