import { getEthernumAuthorityBridge } from "../core/EthernumAuthority.js";
import type { AuthorityBridge, AuthorityHandlerContext } from "../core/AuthorityBridge.js";
import { getContractArchiveService, type ContractArchiveService } from "../contracts/ContractArchiveService.js";
import { CONTRACT_STATUSES } from "../contracts/ContractArchiveTypes.js";
import { getCompanyStoreService, type CompanyStoreService } from "../store/CompanyStoreService.js";
import { PF2eStoreAdapter } from "../store/PF2eStoreAdapter.js";
import { CompanyIdentityService } from "../company/CompanyIdentityService.js";
import { getCompanyRewardService, type CompanyRewardService } from "../rewards/CompanyRewardService.js";
import { getEmergencyBroadcastService, type EmergencyBroadcastService } from "../communicator/EmergencyBroadcastService.js";
import { getLootDeliveryService, type LootDeliveryService } from "../generators/loot/LootDeliveryService.js";
import { getOperationalGeneratorService } from "../generators/OperationalGeneratorService.js";
import { getGeneratedNPCMechanicService, type GeneratedNPCMechanicService } from "../unique/services/GeneratedNPCMechanicService.js";
import type { GMControlCenterSnapshot } from "../ui/GMControlCenterData.js";
import {
  ADMINISTRATIVE_COMMAND_CATEGORY,
  ADMINISTRATIVE_COMMAND_HANDLER,
  type AdministrativeCommand,
  type AdministrativeCommandResult,
  type AdministrativeContractRow,
  type AdministrativeSquadRow,
  type AdministrativeStoreRow,
} from "./AdministrativeCommunicatorTypes.js";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, maximum = 500): string { return typeof value === "string" ? value.trim().slice(0, maximum) : ""; }
function collection<T>(value: unknown): T[] { return value && typeof (value as Iterable<T>)[Symbol.iterator] === "function" ? Array.from(value as Iterable<T>) : []; }
function statusLabel(status: string): string {
  return ({ available: "Disponível", accepted: "Aceito", active: "Ativo", completed: "Concluído", failed: "Falhou", archived: "Arquivado" } as Record<string, string>)[status] ?? status;
}
function isCommand(value: unknown): value is AdministrativeCommand {
  const input = record(value);
  return typeof input.kind === "string" && [
    "contract.publish", "contract.status", "contract.access", "contract.intelligence",
    "contract.document-migrate",
    "store.upsert", "store.remove", "store.toggle", "identity.update", "reward.grant", "broadcast.send", "loot.apply", "loot.chat",
    "npc-mechanic.apply", "npc-mechanic.revert",
  ].includes(input.kind);
}

export class AdministrativeCommunicatorService {
  private registered = false;
  constructor(
    private readonly bridge: AuthorityBridge = getEthernumAuthorityBridge(),
    private readonly contracts: ContractArchiveService = getContractArchiveService(),
    private readonly store: CompanyStoreService = getCompanyStoreService(),
    private readonly rewards: CompanyRewardService = getCompanyRewardService(),
    private readonly broadcasts: EmergencyBroadcastService = getEmergencyBroadcastService(),
    private readonly loot: LootDeliveryService = getLootDeliveryService(),
    private readonly generatedMechanics: GeneratedNPCMechanicService = getGeneratedNPCMechanicService(),
    private readonly adapter = new PF2eStoreAdapter(),
  ) {}

  async initialize(): Promise<void> {
    this.registerHandler();
    if (!this.bridge.isPrimaryGM()) return;
    await this.loot.initialize();
    const policies = await this.bridge.getPolicyConfiguration();
    if (policies.handlers?.[ADMINISTRATIVE_COMMAND_HANDLER] !== "auto") {
      await this.bridge.setPolicyConfiguration({
        ...policies,
        handlers: { ...policies.handlers, [ADMINISTRATIVE_COMMAND_HANDLER]: "auto" },
      });
    }
  }

  registerHandler(): void {
    if (this.registered) return;
    this.bridge.registerHandler<AdministrativeCommand, AdministrativeCommandResult>(ADMINISTRATIVE_COMMAND_HANDLER, {
      validate: context => this.validate(context),
      execute: context => this.execute(context.request.payload),
    }, { replace: true });
    this.registered = true;
  }

  async command(command: AdministrativeCommand): Promise<AdministrativeCommandResult> {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode executar comandos administrativos.");
    const idempotency = this.idempotency(command);
    return this.bridge.request({
      handlerId: ADMINISTRATIVE_COMMAND_HANDLER,
      category: ADMINISTRATIVE_COMMAND_CATEGORY,
      actionId: command.kind,
      sourceActorUuid: "actorUuid" in command
        ? command.actorUuid
        : "reward" in command
          ? command.reward.actorUuid
          : "application" in command
            ? command.application.actorUuid
            : "revert" in command
              ? command.revert.actorUuid
              : undefined,
      summary: this.summary(command),
      idempotencyKey: idempotency,
      payload: command,
    });
  }

  async buildSnapshot(base: GMControlCenterSnapshot): Promise<GMControlCenterSnapshot> {
    if (!game.user?.isGM) return {};
    const [archive, store, identities, ledger, diagnostics] = await Promise.all([
      this.contracts.getArchive(),
      this.store.getStore(),
      CompanyIdentityService.list(),
      this.rewards.getLedger(),
      this.bridge.getDiagnostics(),
    ]);
    const actors = collection<Actor>(game.actors).filter(actor => (actor.type as string) === "character" && actor.uuid);
    const users = collection<User & { character?: Actor | null }>(game.users);
    const contracts: AdministrativeContractRow[] = await Promise.all(archive.contracts.map(async contract => {
      const target = await this.contracts.resolveDocumentTarget(contract.id);
      const reportDocument = contract.reportDocument;
      const reportReference = reportDocument?.path ?? reportDocument?.uuid;
      const reportUnavailable = target?.availability?.status === "unavailable";
      return {
        id: contract.id,
        number: contract.number,
        title: contract.title,
        status: contract.status,
        statusLabel: statusLabel(contract.status),
        ...(contract.location ? { location: contract.location } : {}),
        revision: contract.revision,
        informationFound: contract.informationFound ?? 0,
        informationTotal: contract.informationTotal ?? 0,
        visibility: contract.visibility.mode,
        ...(contract.journalUuid ? { journalUuid: contract.journalUuid } : {}),
        ...(contract.pdfPath ? { pdfPath: contract.pdfPath } : {}),
        ...(reportDocument ? { reportStorage: reportDocument.storage } : {}),
        ...(reportReference ? { reportReference } : {}),
        ...(target?.availability?.status ? { reportAvailability: target.availability.status } : {}),
        ...(reportUnavailable ? {
          reportUnavailable: true,
          reportDiagnostic: [
            "DOCUMENT UNAVAILABLE",
            `Path: ${reportDocument?.path ?? "-"}`,
            `Storage: ${reportDocument?.storage ?? "-"}`,
            `Contract: ${contract.id}`,
          ].join(" | "),
        } : {}),
        canMigrateLegacyReport: reportDocument?.storage === "module-asset",
      };
    }));
    const storeEntries: AdministrativeStoreRow[] = await Promise.all(store.entries.map(async entry => {
      const item = await this.adapter.resolveItem(entry.itemUuid);
      const presentation = item ? this.adapter.itemPresentation(item) : { name: "Item indisponível" };
      const price = item ? this.adapter.resolvePrice(item, entry.priceOverride) : null;
      return {
        id: entry.id,
        itemUuid: entry.itemUuid,
        name: presentation.name,
        ...(presentation.image ? { image: presentation.image } : {}),
        price: price ? `${price.pp ? `${price.pp} pp ` : ""}${price.gp ? `${price.gp} gp ` : ""}${price.sp ? `${price.sp} sp ` : ""}${price.cp ? `${price.cp} cp` : ""}`.trim() || "0 cp" : "Inválido",
        stock: entry.stock === undefined ? "Ilimitado" : String(entry.stock),
        mode: entry.transactionMode === "automatic" ? "Automática" : "Aprovação",
        enabled: entry.enabled,
        revision: entry.revision,
      };
    }));
    const squads: AdministrativeSquadRow[] = actors.map(actor => {
      const identity = identities.identities[actor.uuid!] ?? CompanyIdentityService.resolve(actor);
      const user = users.find(candidate => candidate.character?.uuid === actor.uuid);
      return {
        actorId: actor.id!,
        actorUuid: actor.uuid!,
        actorName: actor.name,
        ...((actor as Actor & { img?: string }).img ? { image: (actor as Actor & { img?: string }).img } : {}),
        ...(user?.name ? { userName: user.name } : {}),
        ...(identity.codename ? { codename: identity.codename } : {}),
        ...(identity.rank === undefined ? {} : { rank: identity.rank }),
        ...(identity.squad ? { squad: identity.squad } : {}),
        ...(identity.department ? { department: identity.department } : {}),
        ...(identity.operationalStatus ? { operationalStatus: identity.operationalStatus } : {}),
        revision: "revision" in identity ? Number(identity.revision) || 0 : 0,
      };
    });
    const requisitions = (base.queue ?? [])
      .filter(item => String(item.actionName ?? "").includes("company-store") || record(item.payload).entryId)
      .map(item => {
        const payload = record(item.payload);
        const entry = store.entries.find(candidate => candidate.id === text(payload.entryId, 160));
        return {
          ...item,
          ...(text(payload.actorUuid, 300) ? { actorUuid: text(payload.actorUuid, 300) } : {}),
          ...(entry?.itemUuid ? { itemUuid: entry.itemUuid } : {}),
        };
      });
    return {
      ...base,
      commandDevice: {
        archiveRevision: archive.revision,
        storeRevision: store.revision,
        identityRevision: identities.revision,
        rewardRevision: ledger.revision,
        primaryGM: this.bridge.getPrimaryGM()?.name ?? "Indisponível",
        primaryReady: Boolean(diagnostics.primaryGMId),
      },
      contracts,
      storeEntries,
      squads,
      intelligence: contracts,
      rewards: [...ledger.rewards].reverse().slice(0, 50),
      broadcasts: this.broadcasts.list(50),
      requisitions,
      previewUsers: users.filter(user => !user.isGM && user.id).map(user => ({ value: user.id!, label: user.character?.name ?? user.name })),
      worldItems: collection<{ uuid?: string | null; name?: string | null }>((game as Game & { items?: Iterable<{ uuid?: string | null; name?: string | null }> }).items)
        .filter(item => item.uuid && item.name).map(item => ({ value: item.uuid!, label: item.name! })),
      generators: getOperationalGeneratorService().snapshot(),
    };
  }

  private validate(context: AuthorityHandlerContext<AdministrativeCommand>): boolean {
    if (!context.requester.isGM || !context.authority.isGM) throw new Error("Comando administrativo sem autoria GM verificável.");
    if (!isCommand(context.request.payload)) throw new Error("Comando administrativo inválido.");
    return true;
  }

  private async execute(command: AdministrativeCommand): Promise<AdministrativeCommandResult> {
    switch (command.kind) {
      case "contract.publish": {
        const data = await this.contracts.publish(command.data, { expectedRevision: command.expectedRevision });
        return { kind: command.kind, message: "Contrato publicado.", revision: data.revision };
      }
      case "contract.status": {
        const data = command.status === "completed"
          ? await this.contracts.complete(command.contractId, { expectedRevision: command.expectedRevision, grade: command.grade })
          : await this.contracts.setStatus(command.contractId, command.status, { expectedRevision: command.expectedRevision });
        return { kind: command.kind, message: "Status do contrato atualizado.", revision: data.revision };
      }
      case "contract.access": {
        const method = command.grant ? this.contracts.grantAccess.bind(this.contracts) : this.contracts.revokeAccess.bind(this.contracts);
        const data = await method(command.contractId, command.principal, { expectedRevision: command.expectedRevision, attachmentId: command.attachmentId });
        return { kind: command.kind, message: command.grant ? "Acesso concedido." : "Acesso revogado.", revision: data.revision };
      }
      case "contract.intelligence": {
        const data = await this.contracts.setIntelligence(command.contractId, command.found, command.total, { expectedRevision: command.expectedRevision });
        return { kind: command.kind, message: "Inteligência atualizada.", revision: data.revision };
      }
      case "contract.document-migrate": {
        const data = await this.contracts.migrateLegacyDocumentToDataFolder({
          contractId: command.contractId,
          attachmentId: command.attachmentId,
          selectedPath: command.selectedPath,
          expectedRevision: command.expectedRevision,
        });
        return { kind: command.kind, message: "Documento copiado e referência portátil validada.", revision: data.revision };
      }
      case "store.upsert": {
        const data = await this.store.upsertEntry(command.entry, { expectedRevision: command.expectedRevision });
        return { kind: command.kind, message: "Oferta salva.", revision: data.revision };
      }
      case "store.remove": {
        const data = await this.store.removeEntry(command.entryId, { expectedRevision: command.expectedRevision });
        return { kind: command.kind, message: "Oferta removida.", revision: data.revision };
      }
      case "store.toggle": {
        const current = (await this.store.getStore()).entries.find(entry => entry.id === command.entryId);
        if (!current) throw new Error("Oferta não encontrada.");
        const data = await this.store.upsertEntry({ ...current, enabled: command.enabled }, { expectedRevision: command.expectedRevision });
        return { kind: command.kind, message: command.enabled ? "Oferta ativada." : "Oferta desativada.", revision: data.revision };
      }
      case "identity.update": {
        const identity = await CompanyIdentityService.update(command.actorUuid, command.identity, { expectedRevision: command.expectedRevision });
        const store = await this.store.getStore();
        const authorization = store.authorizations[command.actorUuid];
        await this.store.setAuthorization(command.actorUuid, {
          rank: identity.rank,
          region: authorization?.region,
          flags: authorization?.flags ?? [],
        });
        return { kind: command.kind, message: `Identidade de ${identity.codename ?? command.actorUuid} atualizada.`, revision: identity.revision };
      }
      case "reward.grant": {
        const result = await this.rewards.grant(command.reward);
        return { kind: command.kind, message: `Recompensa ${result.state}.`, transactionId: result.transactionId };
      }
      case "broadcast.send": {
        const result = await this.broadcasts.send(command.broadcast);
        return { kind: command.kind, message: `Comunicado ${result.severity.toUpperCase()} enviado.`, transactionId: result.broadcastId };
      }
      case "loot.apply": {
        const result = await this.loot.apply(command.application);
        if (result.state !== "completed") throw new Error(`A entrega de loot terminou em ${result.state}; consulte o ledger administrativo.`);
        return { kind: command.kind, message: `Loot ${result.state} em ${result.actorName}.`, transactionId: result.applicationId };
      }
      case "loot.chat": {
        const transactionId = await this.loot.postToChat(command.manifest);
        return { kind: command.kind, message: "Manifesto de loot publicado no chat.", transactionId };
      }
      case "npc-mechanic.apply": {
        const result = await this.generatedMechanics.apply(command.application);
        return { kind: command.kind, message: `Mecânica ${result.state} em ${result.actorName}.`, transactionId: result.applicationId };
      }
      case "npc-mechanic.revert": {
        const result = await this.generatedMechanics.revert(command.revert);
        return { kind: command.kind, message: `Mecânica ${result.state} em ${result.actorName}.`, transactionId: command.revert.revertId };
      }
    }
  }

  private idempotency(command: AdministrativeCommand): string {
    if (command.kind === "reward.grant") return `admin:reward:${command.reward.transactionId}`;
    if (command.kind === "broadcast.send") return `admin:broadcast:${command.broadcast.broadcastId}`;
    if (command.kind === "loot.apply") return `admin:loot:apply:${command.application.applicationId}`;
    if (command.kind === "loot.chat") return `admin:loot:chat:${command.manifest.manifestId}`;
    if (command.kind === "npc-mechanic.apply") return `admin:npc-mechanic:apply:${command.application.applicationId}`;
    if (command.kind === "npc-mechanic.revert") return `admin:npc-mechanic:revert:${command.revert.revertId}`;
    if (command.kind === "contract.document-migrate") {
      return `admin:contract-document-migrate:${command.contractId}:${command.selectedPath}:${command.expectedRevision}`;
    }
    return `admin:${command.kind}:${foundry.utils.randomID(24)}`;
  }

  private summary(command: AdministrativeCommand): string {
    if (command.kind.startsWith("contract.")) return `Contratos: ${command.kind.split(".")[1]}`;
    if (command.kind.startsWith("store.")) return `Loja: ${command.kind.split(".")[1]}`;
    if (command.kind === "identity.update") return "Identidade da Companhia atualizada";
    if (command.kind === "reward.grant") return "Recompensa distribuída";
    if (command.kind.startsWith("loot.")) return `Loot: ${command.kind.split(".")[1]}`;
    if (command.kind.startsWith("npc-mechanic.")) return `Mecânica NPC: ${command.kind.split(".")[1]}`;
    return "Comunicado operacional enviado";
  }
}

let service: AdministrativeCommunicatorService | null = null;
export function getAdministrativeCommunicatorService(): AdministrativeCommunicatorService {
  return service ??= new AdministrativeCommunicatorService();
}
