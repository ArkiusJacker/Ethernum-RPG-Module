import { handleCommunicatorCommand } from "./CommunicatorCommandController.js";
import { handleCompanyCommand } from "./CompanyCommandController.js";
import { handleContractCommand } from "./ContractCommandController.js";
import { handleGeneratorCommand } from "./GeneratorCommandController.js";
import { handleStoreCommand } from "./StoreCommandController.js";
import type { GMControlDomainCommandHandler } from "./GMCommandSupport.js";

export const GM_CONTROL_COMMAND_HANDLERS: readonly GMControlDomainCommandHandler[] = Object.freeze([
  handleGeneratorCommand,
  handleContractCommand,
  handleStoreCommand,
  handleCompanyCommand,
  handleCommunicatorCommand,
]);

export function createGMControlCommandDispatcher(
  handlers: readonly GMControlDomainCommandHandler[] = GM_CONTROL_COMMAND_HANDLERS,
): GMControlDomainCommandHandler {
  return async (action, payload) => {
    for (const handler of handlers) {
      if (await handler(action, payload)) return true;
    }
    throw new Error(`Ação administrativa não reconhecida: ${action || "(vazia)"}.`);
  };
}

export const dispatchGMControlCommand = createGMControlCommandDispatcher();
