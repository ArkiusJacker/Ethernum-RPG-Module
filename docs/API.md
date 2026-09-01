# Ethernum RPG Module API

Este documento descreve o contrato de integração de `game.ethernum` a partir da API `1` (módulo v3.8.11). Métodos não listados como suportados devem ser tratados como detalhes internos e podem mudar entre versões.

## API suportada

### Identificação

- `game.ethernum.apiVersion`: versão do contrato público, atualmente `"1"`.
- `game.ethernum.ETHERNUM`: constantes de identificação e caminhos do módulo. Os valores existentes são estáveis dentro da API 1.

### Interfaces

- `game.ethernum.ui.openFieldCommunicator()`
- `game.ethernum.ui.closeFieldCommunicator()`
- `game.ethernum.ui.toggleFieldCommunicator()`
- `game.ethernum.ui.refreshFieldCommunicator()`
- `game.ethernum.ui.openGMControlCenter()` e demais operações `*GMControlCenter()`. Retornam `false` para usuários sem permissão de mestre.
- `game.ethernum.ui.characterSheetDiagnostics(actor)`
- `game.ethernum.ui.openCharacterSheetDiagnostics(actor)`

### Contratos e Loja

- `game.ethernum.contracts.list(previewUserId?)`: projeção filtrada pelos ACLs do usuário atual. Pré-visualização é aceita apenas para mestre.
- `game.ethernum.store.list(previewUserId?, selectedEntryId?)`: catálogo projetado para o usuário atual.
- `game.ethernum.store.purchase(entryId)`: solicita uma compra pelo fluxo transacional e de autoridade do módulo.
- `game.ethernum.contracts.admin` e `game.ethernum.store.admin`: fachadas estáveis disponíveis somente para mestre. Não expõem os repositórios mutáveis.

### Macros

Os namespaces canônicos são suportados e devem ser preferidos por novas macros:

- `game.ethernum.macros.combat.*`
- `game.ethernum.macros.ethernumCompany.gyro.*`
- `game.ethernum.macros.ethernumCompany.bayle.*`
- `game.ethernum.macros.ethernumCompany.pipping.*`
- `game.ethernum.macros.ethernumCompany.charles.*`
- `game.ethernum.macros.ethernumCompany.atlas.*`
- `game.ethernum.macros.concordia.*`

As chamadas validam o Actor e preservam o protocolo de autoridade aplicado à mecânica correspondente.

## API experimental

- `game.ethernum.ai.status()` e `game.ethernum.ai.admin`: integração opcional de assistência de IA. Propostas continuam marcadas como experimentais e exigem decisão explícita do mestre.
- `game.ethernum.diagnostics.performance()`: amostras agregadas da sessão local. IDs de métricas e campos adicionais podem evoluir na API 1.
- `game.ethernum.unique`: fachada histórica ampla das mecânicas únicas. É mantida por compatibilidade, mas novas integrações devem preferir os namespaces de macro ou interfaces específicas documentadas.

APIs experimentais não tornam canônicos os templates `[TESTE]` de mecânicas geradas.

## Serviços internos

Não são API pública:

- `CompanyIdentityRepository`, `CompanyStoreRepository` e armazenamento do arquivo de contratos;
- `EthernumAuthorityBridge`, filas, handlers e envelopes de socket;
- controladores em `scripts/ui/gm-control/`;
- serviços de projeção, migração e recuperação transacional;
- registradores, caches, observadores e telemetria mutável;
- adaptadores PF2e e serviços de documentos/canvas.

Esses componentes são acessados por fachadas imutáveis ou comandos auditados. Consumidores externos não devem importar seus caminhos nem editar flags/projeções diretamente.

## Aliases descontinuados

Aliases de macros no nível raiz, como `momentumFides`, `fulgorNegro`, `showPippingStatus`, `gainGyroSP` e equivalentes antigos, continuam funcionais durante a API 1. Eles são considerados descontinuados para código novo, mas não serão removidos sem migração e janela explícita de compatibilidade.

Nenhum alias histórico foi removido na v3.8.11.

## Compatibilidade

- Baseline: Foundry VTT 13 e PF2e.
- `DialogV2` é usado quando disponível; o fallback legado permanece para instalações onde a API moderna não exista.
- Não edite diretamente as flags do módulo a partir de integrações. Use as fachadas públicas para preservar migrações, ACLs, autoridade e projeções.
