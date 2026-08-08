import type { UniqueMechanicsRuntime } from "../../mechanics/types.js";
import { UniqueMechanicsSystem } from "../UniqueMechanics.js";

export const uniqueMechanicsCompatibilityRuntime = UniqueMechanicsSystem as unknown as UniqueMechanicsRuntime;
