import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(import.meta.dirname, "../scripts/communicator/FieldCommunicatorService.ts"), "utf8");

describe("Field Communicator panel error boundaries", () => {
  it("isolates Contract and Store snapshot failures from the full communicator", () => {
    expect(source).toContain('panelFailures.add("contracts")');
    expect(source).toContain('panelFailures.add("shop")');
    expect(source).toContain("Contract panel snapshot failed");
    expect(source).toContain("Store panel snapshot failed");
    expect(source).toContain("temporariamente indisponível");
  });
});
