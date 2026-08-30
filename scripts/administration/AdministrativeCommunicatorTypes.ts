import type {
  ContractDocumentAvailabilityStatus,
  ContractDocumentStorage,
  EthernumContractPrincipal,
  EthernumContractStatus,
} from "../contracts/ContractArchiveTypes.js";
import type { CompanyStoreEntry } from "../store/CompanyStoreTypes.js";
import type { CompanyIdentitySnapshot } from "../company/CompanyIdentityService.js";
import type { CompanyRewardGrantInput } from "../rewards/CompanyRewardTypes.js";
import type { EmergencyBroadcastInput } from "../communicator/EmergencyBroadcastService.js";
import type { LootApplicationInput, LootManifest } from "../generators/loot/LootGeneratorTypes.js";
import type {
  GeneratedNPCMechanicApplicationInput,
  GeneratedNPCMechanicRevertInput,
} from "../generators/mechanics/GeneratedNPCMechanicTypes.js";

export const ADMINISTRATIVE_COMMAND_HANDLER = "administrative-communicator.command";
export const ADMINISTRATIVE_COMMAND_CATEGORY = "administration";

export type AdministrativeCommand =
  | { kind: "contract.publish"; data: unknown; expectedRevision: number }
  | { kind: "contract.status"; contractId: string; status: EthernumContractStatus; expectedRevision: number; grade?: string }
  | { kind: "contract.access"; contractId: string; principal: EthernumContractPrincipal; grant: boolean; attachmentId?: string; expectedRevision: number }
  | { kind: "contract.intelligence"; contractId: string; found: number; total: number; expectedRevision: number }
  | { kind: "contract.document-migrate"; contractId: string; attachmentId?: string; selectedPath: string; expectedRevision: number }
  | { kind: "store.upsert"; entry: Partial<CompanyStoreEntry>; expectedRevision: number }
  | { kind: "store.remove"; entryId: string; expectedRevision: number }
  | { kind: "store.toggle"; entryId: string; enabled: boolean; expectedRevision: number }
  | { kind: "identity.update"; actorUuid: string; identity: Partial<CompanyIdentitySnapshot>; expectedRevision: number }
  | { kind: "reward.grant"; reward: CompanyRewardGrantInput }
  | { kind: "broadcast.send"; broadcast: EmergencyBroadcastInput }
  | { kind: "loot.apply"; application: LootApplicationInput }
  | { kind: "loot.chat"; manifest: LootManifest }
  | { kind: "npc-mechanic.apply"; application: GeneratedNPCMechanicApplicationInput }
  | { kind: "npc-mechanic.revert"; revert: GeneratedNPCMechanicRevertInput };

export interface AdministrativeCommandResult {
  kind: AdministrativeCommand["kind"];
  message: string;
  revision?: number;
  transactionId?: string;
}

export interface AdministrativeContractRow {
  id: string;
  number: number;
  title: string;
  status: EthernumContractStatus;
  statusLabel: string;
  location?: string;
  revision: number;
  informationFound: number;
  informationTotal: number;
  visibility: string;
  journalUuid?: string;
  pdfPath?: string;
  reportStorage?: ContractDocumentStorage;
  reportReference?: string;
  reportAvailability?: ContractDocumentAvailabilityStatus;
  reportUnavailable?: boolean;
  reportDiagnostic?: string;
  canMigrateLegacyReport?: boolean;
}

export interface AdministrativeStoreRow {
  id: string;
  itemUuid: string;
  name: string;
  image?: string;
  price: string;
  stock: string;
  mode: string;
  enabled: boolean;
  revision: number;
}

export interface AdministrativeSquadRow {
  actorId: string;
  actorUuid: string;
  actorName: string;
  image?: string;
  userName?: string;
  codename?: string;
  rank?: number;
  squad?: string;
  department?: string;
  operationalStatus?: string;
  revision: number;
}
