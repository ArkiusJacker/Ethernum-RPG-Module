import { describe, expect, it } from "vitest";
import {
  evaluateReleaseTopology,
  parseArguments,
  resolveTagRef,
} from "../tools/validate-release-topology.mjs";

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

  it("resolves an explicit ref, GitHub tag ref, or exact local tag in priority order", () => {
    expect(resolveTagRef({ explicitTagRef: "v3.8.11", githubRefName: "v9.0.0", githubRefType: "tag", exactLocalTag: "v1.0.0" })).toBe("v3.8.11");
    expect(resolveTagRef({ githubRefName: "v3.8.11", githubRefType: "tag", exactLocalTag: "v1.0.0" })).toBe("v3.8.11");
    expect(resolveTagRef({ githubRefName: "main", githubRefType: "branch", exactLocalTag: "v3.8.11" })).toBe("v3.8.11");
  });

  it("keeps argument compatibility and gives actionable guidance when no tag exists", () => {
    expect(parseArguments(["--tag-ref", "v3.8.11", "--main-ref", "HEAD"], {}, "")).toEqual({
      tagRef: "v3.8.11",
      mainRef: "HEAD",
    });
    expect(() => parseArguments([], { CI: "true", GITHUB_REF_NAME: "main", GITHUB_REF_TYPE: "branch" }, ""))
      .toThrow(/Pass --tag-ref vX\.Y\.Z/);
  });
});
