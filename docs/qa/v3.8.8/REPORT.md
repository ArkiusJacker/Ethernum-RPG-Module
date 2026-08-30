# v3.8.8 QA Report

## Environment

- Runtime: Foundry 13.351, PF2e 7.8.0.
- Primary GM: `Gamemaster`, native Foundry client.
- Secondary GM: `ChatGPT Gamemaster`, browser client.
- Player A: `Bayle`, browser client.
- Player B: `Pipping`, browser client.
- The live world retained the QA Actors and Item for repeatable inspection. The QA Store offer was disabled at the end instead of being deleted.

## Automated Validation

- `npm run typecheck`: pass.
- `npm test`: 93 files / 656 tests pass.
- `npm run build`: pass; 176 modules transformed.
- `npm run validate:manifest`: pass; 13 manifest references.
- `npm run validate:dist`: pass; 13 references and local imports.
- `npm run report:size`: pass; 41.27 MiB, 79 files, no exact duplicate groups and no source-art files.
- `npm audit --omit=dev`: zero vulnerabilities.
- Release topology is validated against the final tag and `origin/main` after publication.

## Authority Matrix

- The secondary GM successfully executed Store, Reward, Loot and NPC Mechanics mutations through the primary GM.
- A test with all socket delivery dropped recovered the signed request from its expiring User flag and the terminal response from persistent audit state.
- Response validation still requires the current primary active GM, and recovered requests retain authorship, expiry, payload and idempotency checks.
- Bayle and Pipping had no captured module console errors after initialization. The secondary-GM client also had no captured errors.

## Store

- Real non-GM purchase: Bayle bought `QA Store Token v3.8.8` for `1 cp`.
- Transaction short ID: `OGGM2DBJ`.
- The Item was delivered to Bayle, currency changed from `2 pp` to `1 pp, 9 gp, 9 sp, 9 cp`, and stock changed from 2 to 1.
- The Recovery Center rendered with zero unresolved transactions after reconciliation.
- The secondary GM disabled and re-enabled the offer during the toggle regression test. The offer was left disabled after QA.
- Automated coverage includes approval mode, insufficient currency, stale quote, stock exhaustion/race, duplicate request, broken UUID, ownership rejection and rollback failure.

## Rewards

- Pipping received `QA Store Token v3.8.8`, `1 gp`, `25 XP` metadata, `1 EP` and the `QA v3.8.8` commendation.
- Ledger entry: `reward-AjQRDB4f3WvbrzpUHfkCLjgE`, completed at 02:16:21.
- Automated coverage includes duplicate execution, compensation, uncertain completion and recovery.

## Loot

- Actor: `QA Loot Actor v3.8.8`.
- Seed: `qa-v3.8.8-loot`.
- Preview selected `1x Sulfur Bomb (Lesser)` worth 4 gp plus 1 gp in currency.
- The live Actor showed one Item, 1 gp currency and 5 gp total wealth after delivery.
- Repeating the exact manifest did not duplicate Item or currency; Audit Log recorded the first request as `Executed` and the repeat as `Duplicate`.
- Automated coverage includes rollback after a partial failure.

## NPC Mechanics

- Actor: `QA NPC Mechanics v3.8.8`.
- First seed `qa-v3.8.8-npc` generated `[TESTE] Aura de Pressão` and `[TESTE] Contrapulso`; both were applied, inspected in the native PF2e sheet and reverted.
- Second seed `qa-v3.8.8-npc-manual` generated `[TESTE] Passagem Cortante` and `[TESTE] Reserva Volátil` beside the manual Item `QA Manual Action v3.8.8`.
- After revert, both generated Items disappeared and `QA Manual Action v3.8.8` remained. This confirms that reversal is scoped to generated content.

## Contracts and Package

- Contract document storage uses Data Folder paths selected through the Foundry FilePicker rather than bundling future campaign files into the module.
- The administrative migration command is primary-GM-authorized, idempotent and keeps legacy Contract 01 compatibility.
- The package report identifies the legacy Contract 01 PDF as the largest bundled file at 14.10 MiB without removing it in this compatibility release.
- QA screenshots are not present in `dist`.

## Evidence

- `authority-audit-live.jpg`: primary/secondary authority audit after live mutations.
- `npc-mechanics-applied.jpg`: first generated pair applied to the PF2e NPC.
- `npc-mechanics-reverted.jpg`: first generated pair removed.
- `npc-manual-content-applied.jpg`: manual Item and second generated pair together.
- `npc-manual-content-reverted.jpg`: manual Item preserved after generated content was reverted.

## Residual Limits

- Approval mode, stock-race contention and forced rollback paths are covered deterministically in automated tests rather than by corrupting the persistent QA world.
- Foundry 14 remains experimental; this release was validated on the supported Foundry 13 baseline.

## HARVEST

- Invoked: no.
- Experimental changes: none.
