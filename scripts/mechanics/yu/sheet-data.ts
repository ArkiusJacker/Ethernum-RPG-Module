import { selectProfileSheetData } from "../sheet-data.js";
import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export function buildYuSheetData(actor: Actor, isGM: boolean): Record<string, unknown> {
  return selectProfileSheetData(UniqueMechanicsKernel.buildSheetData(actor, isGM), "yu-jiu-ji-tae");
}
