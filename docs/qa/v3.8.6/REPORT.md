# v3.8.6 Implementation and QA Report

## Version

v3.8.6 - Optional AI-Assisted Unique Mechanic Generation

## Git

- Release ref: `v3.8.6`
- Release commit: the immutable commit resolved by tag `v3.8.6`
- Release URL: <https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v3.8.6>

## Validation

### AUTOMATED TESTED

- `npm ci`: pass
- `npm run typecheck`: pass
- `npm test`: pass, 85 files and 613 tests
- `npm run build`: pass
- `npm run validate:manifest`: pass
- `npm run validate:dist`: pass
- `npm audit --omit=dev`: pass, 0 production vulnerabilities
- Static security tests confirm there is no client API key, authorization header,
  provider URL, direct AI fetch, AI world setting, `localStorage`, `eval` or
  `new Function` in the assistance implementation.

### BROWSER TESTED

- AI status and data-boundary DOM rendered inside the authenticated Command
  Device session.
- The unavailable button was disabled and the deterministic controls remained
  available.
- Store, Communicator Settings and native PF2e Inventory, Actions and Effects
  navigation were revisited as cross-release checks.

### FOUNDRY TESTED

- Foundry VTT: 13.351.0
- PF2e: 7.8.0
- User: authenticated secondary Gamemaster
- Visual verification: pass
- Evidence: `ai-unavailable-data-boundary-foundry.png`
- No Ethernum warning or error appeared during the inspected flows.

## Explicit Requested Work

- Generic AI provider interface decoupled from the deterministic generator.
- Secure-server/proxy requirement and unavailable state when no provider exists.
- Minimum NPC data projection with explicit exclusions.
- Strict JSON/schema/mechanical/power validation pipeline.
- Manual GM request, preview, text edit, approve and reject workflow.
- `AI ASSISTED` label plus provider/model/time/version/decision audit.
- Provider and validation failures contained without degrading v3.8.5 behavior.

## BUGS FOUND DURING DEVELOPMENT

No new reproducible bug was found in v3.8.6.

| Area | Bug | Severity | Originally requested? | Fixed? | Validation |
| --- | --- | --- | --- | --- | --- |
| Cross-release QA | None reproduced | N/A | N/A | N/A | Store, Communicator Settings and PF2e Inventory/Actions/Effects opened without module errors |

## EXPERIMENTAL [TESTE] CHANGES

| Change | Status | Default | Promotion condition |
| --- | --- | --- | --- |
| `[TESTE - AI]` provider architecture and assistance panel | Implemented experimental | Unavailable | Approved secure backend and campaign evaluation |
| `[TESTE]` text-only refinement of deterministic mechanics | Implemented experimental | Manual GM action | Quality, cost and balance review |
| In-memory assistance audit | Implemented experimental | Session-local | Privacy and retention policy for any future server audit |

## Known Limitations

- No live AI provider or backend is bundled. This is intentional: a browser-side
  provider would violate the required secret and privacy boundary.
- Audit is bounded and session-local; it does not persist provider content or
  secrets into the world.
- AI may refine presentation text only. It cannot add components or change
  operations, action economy, damage, DC, budget or application behavior.
- Live AI success cannot be visually tested until an approved secure provider is
  deployed. Valid, invalid, failed, accepted and rejected provider flows are
  covered by automated tests using the generic interface.
- `npm audit` reports two high-severity TinyMCE advisories only through the
  compile-time Foundry type package. The production dependency audit is clean;
  npm's remaining fix requires a forced, breaking type-package replacement and
  was intentionally not applied during this release.

## HARVEST

- Mode: Full
- Seed: optional assistance without dependency or client secrets
- Canonical harvest: deterministic-first, minimum context, strict validation and
  service-level approval enforcement
- Rejected: direct provider calls, unconstrained generation, private world data
  and automatic application
- Backlog: separately deployed secure adapter after explicit approval
