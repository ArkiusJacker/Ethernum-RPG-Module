# Ethernum Master Report - v3.7.9 to v3.8.6

Development date range: 2026-08-19 to 2026-08-24

All eight versions were implemented, validated, tagged and published in sequence.
Each release has its own Foundry updater assets (`module.json` and
`ethernum-rpg-module.zip`).

| Version | Main Focus | Tests | Foundry | Release |
| --- | --- | --- | --- | --- |
| 3.7.9 | PF2e/visual hardening | 65 files / 504 tests | Tested | [v3.7.9](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v3.7.9) |
| 3.8.0 | Communicator motion | Automated suite green | Tested | [v3.8.0](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v3.8.0) |
| 3.8.1 | Contracts | Automated suite green | Tested | [v3.8.1](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v3.8.1) |
| 3.8.2 | Store | Automated suite green | Tested | [v3.8.2](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v3.8.2) |
| 3.8.3 | Admin Device | 77 files / 575 tests | Tested | [v3.8.3](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v3.8.3) |
| 3.8.4 | Loot/Encounter | 80 files / 588 tests | Tested | [v3.8.4](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v3.8.4) |
| 3.8.5 | NPC Mechanic Generator | 83 files / 601 tests | Tested | [v3.8.5](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v3.8.5) |
| 3.8.6 | Optional AI | 85 files / 613 tests | Tested | [v3.8.6](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v3.8.6) |

## Delivered System

- PF2e parity and Ethernum visual hardening across the existing character sheets.
- A finite, permission-aware Field Communicator with restored navigation,
  animations and safe compact behavior.
- Contract Archive with secure projections and embedded PDF.js viewer.
- Company Store with native PF2e currency, stock, approval and transaction
  recovery.
- Ethernum Command Device with a consolidated authority, identity, reward,
  broadcast and audit plane.
- Deterministic loot generation, encounter analysis and transactional delivery.
- Deterministic NPC Unique Mechanic generation with constrained declarative
  templates, power budgets, preview, application and rollback.
- Optional `[TESTE - AI]` text refinement architecture with no client secret,
  minimum data exposure and mandatory GM approval.

## Validation Summary

- Every version passed typecheck, automated tests, production build, manifest
  validation and distribution validation before publication.
- Every version received an authenticated Foundry visual/smoke pass when its
  user-facing flow was available.
- The last release passed 613 automated tests on Foundry 13.351.0 / PF2e 7.8.0
  and included a cross-release visit to Store, Communicator Settings and native
  PF2e sheet tabs.
- GitHub Actions and updater assets were checked after publication of every tag.

## Bugs Found During Development

The individual QA reports record defects discovered outside the original scope,
including permission metadata exposure, asynchronous mount races, compact
viewport overflow, authority handoff, Foundry document-class context, free-price
parsing, GM device collision, preview controller identity, broadcast refresh,
secondary-GM read authority and the deprecated PF2e movement getter. Each listed
defect was fixed and covered by automated or live validation before its release.

No new reproducible bug was found during the v3.8.6 cross-release pass.

## Experimental [TESTE] Changes

- The thirteen deterministic NPC mechanic template families remain `[TESTE]`
  pending campaign balance feedback.
- The entire optional AI assistance layer remains `[TESTE - AI]`, unavailable by
  default and unable to affect mechanical structure.
- No experimental feature is silently canonicalized by this report.

## Known Limitations

- v3.8.5 live apply/revert was blocked by the primary GM retaining the previous
  client bundle; the authority wait was correct and the transaction is covered by
  tests, but that specific live mutation was not represented as completed.
- v3.8.6 ships no live AI provider. A separately secured backend is required
  before provider success can be exercised in Foundry.
- Concórdia visual assets and the deferred character work named after this
  roadmap remain outside this release sequence.
