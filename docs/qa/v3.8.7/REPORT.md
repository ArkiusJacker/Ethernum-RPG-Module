# v3.8.7 QA Report

## Repository Integrity

- Remote `main` before repair: `89e52c2bee1b91217535751b78cfdc3bf07c9a26` (v3.8.2).
- Fast-forward repair target: `0bbd2088693bb377e3f67e2da9fec751d749d62f` (v3.8.6).
- No history rewrite, tag deletion or release replacement was performed.
- `validate:topology` confirmed v3.8.6 is an ancestor of repaired `origin/main`.
- The v3.8.7 release workflow now performs the same ancestry check before packaging.
- Final v3.8.7 tag and `main` SHAs are verified against GitHub during release publication.

## Automated Validation

- `npm ci`: pass.
- `npm run typecheck`: pass.
- `npm test`: 89 files / 622 tests pass.
- `npm run validate:manifest`: pass.
- `npm run build`: pass.
- `npm run validate:dist`: pass.
- `npm audit --omit=dev`: zero vulnerabilities.
- Full audit: two high development-only TinyMCE advisories through the Foundry type package.
- Profile motion registry covers Pipping, Gyro, Bayle, Arkius, Yu, Charles and Atlas in Full, Reduced and Off modes.

## Foundry Matrix

- Runtime: Foundry 13.351, PF2e 7.8.0.
- Primary `Gamemaster`: online, observed but not controlled.
- Secondary GM: `ChatGPT Gamemaster`, diagnostics and sheet parity tested.
- Player A: `Bayle`, Ethernum/PF2e switch, permissions and all sheet tabs tested.
- Player B: `Pipping`, permissions and all sheet tabs tested.
- The server retained v3.8.6 manifest metadata during hot file replacement; the loaded v3.8.7 code and dist manifest were verified separately. A normal module update/restart refreshes this metadata.

## Live Results

- Pipping parity: 54/54 checks matched, including six spellcasting checks.
- The first pass exposed three false mismatches because empty PF2e rank containers were compared with presentation-only occupied ranks. Normalization was corrected and re-tested live.
- Bayle Strike parity: Ethernum and PF2e Original both showed `+10`, `+6 (MAP -4)` and `+2 (MAP -8)`.
- Overview, Combat, Equipment, Magic, Feats, Ether, Runes, Unique Mechanic and Effects opened in all three controlled sessions.
- Players retained access to `Open original PF2e sheet`; GM Control Center and diagnostics were absent for players.
- No Actor HP, inventory, currency, spell slots or effects were mutated. Bayle's presentation mode was intentionally set to Ethernum through the player-facing switch.
- Secondary-GM console: no module errors during the sweep.

## Confirmed Follow-Up

- Both player sessions log an unauthorized administrative Rewards read during initialization. The operation is denied, but logging an expected denial as an error is incorrect. This moves directly into the v3.8.8 authority and reliability work.
- Foundry 14 remains experimental because this campaign sweep used the supported Foundry 13 baseline.

## Evidence

- `pipping-overview-gm.png`: Ethernum overview under secondary GM.
- `pipping-parity-54-of-54.png`: read-only PF2e parity panel after live correction.
- `bayle-player-sheet.png`: Bayle player sheet without GM controls.
- `pipping-player-sheet.png`: Pipping player sheet without GM controls.

## HARVEST

- Invoked: yes.
- Mode: Lite.
- Experimental changes: none.
- Registered experiments remain `AWAITING_USER_APPROVAL`.
