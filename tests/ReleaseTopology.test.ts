import { describe, expect, it } from "vitest";
import { evaluateReleaseTopology } from "../tools/validate-release-topology.mjs";

describe("release topology guard", () => {
  it("accepts a release commit contained in main", () => {
    expect(evaluateReleaseTopology({
      tagCommit: "release-sha",
      mainCommit: "later-main-sha",
      mergeBase: "release-sha",
    })).toMatchObject({ tagAncestorOfMain: true });
  });

  it("rejects a tag from a side branch even when main exists", () => {
    expect(evaluateReleaseTopology({
      tagCommit: "side-branch-sha",
      mainCommit: "main-sha",
      mergeBase: "older-shared-sha",
    })).toMatchObject({ tagAncestorOfMain: false });
  });

  it("distinguishes tag, main and merge-base commits", () => {
    expect(evaluateReleaseTopology({
      tagCommit: "tag",
      mainCommit: "main",
      mergeBase: "base",
    })).toEqual({
      tagCommit: "tag",
      mainCommit: "main",
      mergeBase: "base",
      tagAncestorOfMain: false,
    });
  });
});
