import { describe, expect, it } from "vitest";
import { resolveCompanyIdentity } from "../scripts/company/CompanyIdentityService.js";

function actor(flags: Record<string, unknown>, level = 20): Actor {
  return {
    system: { details: { level: { value: level } } },
    getFlag: (_module: string, key: string) => flags[key],
  } as unknown as Actor;
}

describe("CompanyIdentityService", () => {
  it("never treats PF2e level as Company Rank", () => {
    expect(resolveCompanyIdentity(actor({}, 20))).toEqual({ squadIds: [] });
  });

  it("prioritizes explicit identity rank over communicator and profile fallbacks", () => {
    const snapshot = resolveCompanyIdentity(actor({
      companyIdentity: { rank: 2, codename: "Nightbird", department: "Field Ops" },
      fieldCommunicator: { rank: 4, squadIds: ["squad-a"] },
      companyProfile: { rank: 6 },
    }));
    expect(snapshot).toMatchObject({ rank: 2, codename: "Nightbird", department: "Field Ops" });
    expect(snapshot.squadIds).toEqual(["squad-a"]);
  });

  it("keeps compatibility with existing field communicator flags", () => {
    expect(resolveCompanyIdentity(actor({
      fieldCommunicator: { rank: 3, squadId: "ethernum-prime", operationalStatus: "active" },
    }))).toMatchObject({ rank: 3, squad: "ethernum-prime", operationalStatus: "active" });
  });

  it("uses profile and squad ranks only when explicit ranks are absent", () => {
    expect(resolveCompanyIdentity(actor({ companyProfile: { rank: 5 } })).rank).toBe(5);
    expect(resolveCompanyIdentity(actor({ squad: { rank: 7 } })).rank).toBe(7);
  });
});
