import { describe, expect, it } from "vitest";
import { projectCompanySquadMembers } from "../scripts/company/CompanyIdentityRepository.js";
import type { CompanyIdentityData, CompanyIdentityRecord } from "../scripts/company/CompanyIdentityTypes.js";

function identity(actorUuid: string, squadIds: string[], codename: string): CompanyIdentityRecord {
  return { actorUuid, squadIds, codename, revision: 1, updatedAt: 1 };
}

describe("Company squad projection", () => {
  it("includes only users sharing an existing squad and does not merge unrelated squads", () => {
    const data: CompanyIdentityData = {
      schemaVersion: 1,
      revision: 1,
      updatedAt: 1,
      identities: {
        "Actor.viewer": identity("Actor.viewer", ["alpha", "beta"], "Viewer"),
        "Actor.alpha": identity("Actor.alpha", ["alpha", "classified"], "Alpha"),
        "Actor.beta": identity("Actor.beta", ["beta"], "Beta"),
        "Actor.gamma": identity("Actor.gamma", ["gamma"], "Gamma"),
      },
    };
    const users = [
      { id: "viewer", name: "Viewer", character: { uuid: "Actor.viewer", name: "Viewer" } as Actor },
      { id: "alpha", name: "Alpha", character: { uuid: "Actor.alpha", name: "Alpha" } as Actor },
      { id: "beta", name: "Beta", character: { uuid: "Actor.beta", name: "Beta" } as Actor },
      { id: "gamma", name: "Gamma", character: { uuid: "Actor.gamma", name: "Gamma" } as Actor },
    ];

    const viewerProjection = projectCompanySquadMembers(data, users, "Actor.viewer");
    expect(viewerProjection.map(member => member.userId)).toEqual(["viewer", "alpha", "beta"]);
    expect(viewerProjection.find(member => member.userId === "alpha")?.identity.squadIds).toEqual(["alpha"]);
    expect(projectCompanySquadMembers(data, users, "Actor.alpha").map(member => member.userId))
      .toEqual(["viewer", "alpha"]);
    expect(projectCompanySquadMembers(data, users, "Actor.gamma").map(member => member.userId))
      .toEqual(["gamma"]);
  });

  it("returns no member data when the viewer has no assigned squad", () => {
    const data: CompanyIdentityData = { schemaVersion: 1, revision: 0, updatedAt: 0, identities: {} };
    expect(projectCompanySquadMembers(data, [], "Actor.none")).toEqual([]);
  });
});
