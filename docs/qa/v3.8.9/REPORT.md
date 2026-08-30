# v3.8.9 QA Report

## Environment

- Runtime: Foundry 13.351, PF2e 7.8.0.
- Primary GM: `Gamemaster`, native Foundry client.
- Player client: `Pipping`, in-app browser.
- Permission coverage: native GM player preview for `Pipping Black`.
- Browser note: the three open browser tabs share one authentication session after reload, so simultaneous Bayle/Pipping isolation was not claimed in this pass.

## Automated Validation

- `npm run typecheck`: pass.
- `npm test`: 95 files / 663 tests pass.
- `npm run build`: pass; 177 modules transformed.
- `npm run validate:manifest`: pass; 13 manifest references.
- `npm run validate:dist`: pass; 13 manifest references and local imports.
- `npm run report:size`: 41.32 MiB, 79 files, no exact duplicate groups or source-art files.
- `npm audit --omit=dev`: 0 vulnerabilities.

## Functional Scope

- Online presence derives from the active Foundry User associated with the Actor.
- Signal is explicitly a static local protected channel; no simulated reception bars remain.
- Notification sources are emergency broadcasts, visible group/private messages and visible contracts.
- Read state is per User, notification filters are effective and GM player preview does not mutate player read state.
- Squad projections contain only agents sharing a configured `squadId`; unrelated squad identifiers are removed from the projection.
- Store synchronization reports a pending operation only for a queued purchase.
- World collections are scanned once per snapshot and GM-only build metrics expose the measured counts.

## Foundry Visual and Multiplayer QA

- GM client loaded the `3.8.9` local build and opened the Communicator without module errors.
- GM home state showed `Arkius Jacker` offline, matching the inactive associated User, and the static `CANAL LOCAL PROTEGIDO` signal label.
- GM player preview switched identity and permissions to Pipping, displayed the `SOMENTE LEITURA` banner, removed administrative navigation and blocked an unauthorized route without changing world permissions.
- Pipping showed online, one unread notification and `DADOS LOCAIS PRONTOS` without fabricated signal bars.
- Notification navigation marked only the opened event as read; the contract event opened the `Operação Manifesto 13` detail directly.
- Notification rows remained within their bounds after the compact-layout CSS correction; the `NOVA` state and chevron no longer overlap the timestamp.
- Squad projection rendered the exact `NENHUM ESQUADRÃO ATRIBUÍDO` empty state for Pipping and exposed no unrelated squad data.
- High contrast and reduced motion applied live as `data-high-contrast="true"` and `data-motion="reduced"`; defaults were restored after the test.
- Power-off, reopen and rapid double-click lifecycle checks left exactly one Communicator instance and one header.
- Browser console review found no Ethernum errors after the full interaction pass.

### Evidence

- `gm-player-preview-readonly.png`: GM preview, permission boundary and read-only banner.
- `player-notification-center.png`: player notification center after row-layout correction.
- `player-squad-empty-state.png`: squad isolation and exact empty state.
- `player-high-contrast-reduced-motion.png`: accessibility settings applied live.

## Residual Limits

- Notifications intentionally do not infer Store or Reward history because no reliable player-side event projection currently exists for those sources.
- Signal strength is not measured by Foundry; the UI labels the available state as local data instead of fabricating network telemetry.
- Foundry 14 remains experimental; this release targets the supported Foundry 13 baseline.

## HARVEST

- Invoked: no.
- Experimental changes: none.
