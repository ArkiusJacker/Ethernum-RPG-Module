# v3.7.9 Visual Test Report

Date: 2026-08-19  
Environment: Foundry VTT 13.351, PF2e 7.8.0, local test world  
Actor: Pipping Black, Ethernum Company sheet

## Automated Gates

- TypeScript typecheck: passed.
- Vitest: 65 files, 504 tests passed.
- Production build: passed.
- Manifest and distribution validation: passed.

## Foundry Smoke Test

- Opened all nine tabs: Overview, Combat, Equipment, Magic, Feats, Ether, Runes,
  Unique Mechanic and Effects. Every activation selected one tab and exposed one
  matching panel.
- Edited HP from 38 to 20 and confirmed immediate ratio `0.5263157894736842`
  before persistence; restored 38 and confirmed reconciliation with the Actor.
- Confirmed dedicated currency: PP 0, GP 70, SP 0, CP 0. Coinage was absent from
  generic treasure while three non-coin treasures remained.
- Compared prepared Strike buttons: standard variants `+6`, `+1`, `-4`; agile
  unarmed variants `+6`, `+2`, `-2`. Display and execution indexes use the same
  PF2e prepared variants.
- Switched to the original PF2e sheet and back without losing the custom sheet.
- Confirmed all visible canonical image assets completed with non-zero natural
  width. Static contracts cover the CSS-backed assets.
- Confirmed Pipping profile `pipping-night` in Full Motion resolves to the
  `ecs-profile-pipping-night` animation with a 5.2 second duration.
- No Ethernum action error appeared in the tested flow. Console output contained
  only known Foundry/PF2e deprecation notices.

## Evidence

- [Ethernum overview](01-ethernum-overview.png)
- [Currency inventory](02-currency-inventory.png)
- [Prepared Strike variants](03-prepared-strike-variants.png)

## HARVEST

HARVEST invoked: YES  
Mode: Lite  
Execution: Multi-agent with Facilitator/Critic and Specialist perspectives.  
Seed: restrained, accessible motion for the seven existing profiles.  
Ideas proposed: declarative per-profile motion, bounded transforms, reuse of
existing markup and stable base-stylesheet loading.  
Experiments harvested: none; the motion pass was canonical roadmap work.  
Backlog: none.  
Rejected: aggressive continuous motion and whole-sheet flashing.

## Bugs Discovered During Development

Area: local stylesheet lifecycle  
Bug: a newly registered stylesheet was not picked up by a running Foundry server
until restart, leaving profile motion inactive during hot deployment.  
Severity: P2  
Requested originally: NO  
Fixed: YES  
Validation: the isolated profile stylesheet now loads through the stable base
stylesheet; the browser reports animation `ecs-profile-pipping-night` at `5.2s`.
