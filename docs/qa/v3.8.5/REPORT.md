# v3.8.5 Foundry QA

Date: 2026-08-24

## Environment

- Foundry VTT: authenticated local world at `http://localhost:30000/game`
- System: Pathfinder 2e
- User: `ChatGPT Gamemaster` (secondary GM)
- Primary authority: `Gamemaster`
- NPC: `Adamantine Dragon (Adult, Spellcaster)`, level 13

## Verified

- The `NPC Mechanics` area renders in the GM-only Command Device.
- Boss generation with seed `v3.8.5-foundry-qa` is deterministic.
- PF2e analysis classified Caster, Controller and Defender as the leading roles.
- The preview created Passive, Active, Reaction and Phase components at power 9/9.
- Cards, metadata, warnings and command buttons remain readable without overlap.
- Text editing opens all constrained component text fields.
- Regeneration and preview do not mutate the NPC.
- The deprecated PF2e `system.attributes.speed` warning no longer occurs.
- No Ethernum module errors appeared in the browser console.

## Authority Limitation

The secondary GM submitted the apply command while the connected primary GM
still had the previous module bundle loaded. That primary session could not
complete the new command before the secondary page was reloaded, so live
apply/revert was not represented as successful. The NPC was left unchanged.

The same operation is covered by transactional tests for native Item creation,
idempotency, manual Item/profile preservation, explicit manual-flag replacement,
revert and compensation after persistence failure.

## Automated Verification

- `npm run typecheck`
- `npm test`
- `npm run validate:manifest`
- `npm run build`
- `npm run validate:dist`

## Evidence

- `npc-mechanic-generator-foundry.png`: final preview after PF2e movement and layout fixes.
- `npc-mechanic-generator-foundry-initial.png`: initial pass retained for comparison.
