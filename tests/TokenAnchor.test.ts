import { describe, expect, it } from "vitest";
import { resolveTokenDocumentAnchor } from "../scripts/core/TokenAnchor.js";

describe("token document aura anchors", () => {
  it("uses hook coordinates before the placeable has rendered", () => {
    const anchor = resolveTokenDocumentAnchor({
      id: "token-1",
      uuid: "Scene.scene-1.Token.token-1",
      x: 100,
      y: 200,
      width: 1,
      height: 1,
      parent: { id: "scene-1", grid: { size: 100 } },
    }, {
      x: 400,
      y: 500,
    });

    expect(anchor).toEqual({
      sceneId: "scene-1",
      tokenId: "token-1",
      tokenUuid: "Scene.scene-1.Token.token-1",
      center: { x: 450, y: 550 },
    });
  });

  it("supports non-square tokens and changed dimensions", () => {
    const anchor = resolveTokenDocumentAnchor({
      x: 20,
      y: 40,
      width: 1,
      height: 1,
      parent: { grid: { size: 50 } },
    }, {
      width: 2,
      height: 3,
    });

    expect(anchor?.center).toEqual({ x: 70, y: 115 });
  });

  it("returns null when no finite document position exists", () => {
    expect(resolveTokenDocumentAnchor({ x: "bad", y: undefined })).toBeNull();
  });
});
