# Compatibility Matrix

This matrix separates install policy from code fallbacks. Ethernum remains a UI
and controller layer over one PF2e Actor; PF2e prepared data and public document
operations are authoritative.

| Foundry VTT | PF2e | Status | Test level | Notes |
| --- | --- | --- | --- | --- |
| 13.351 | 7.8.0 | Supported baseline | Automated suite plus full campaign smoke tests | Character sheets, profile mechanics, tracker, communicators, Store, Contracts, generators and GM controls are exercised here. |
| 14 | Compatible PF2e release | Experimental / partial | Live Store and Journal smoke pass in v3.8.2 plus build validation | A complete current campaign sweep has not been performed. Back up the world and validate PF2e before upgrading. |
| 12 | Compatible PF2e release | Unsupported / best effort code paths | No current runtime QA | Some guarded Application V1 fallbacks remain, but new installs are not declared compatible. |
| 11 | Compatible PF2e release | Unsupported | No current runtime QA | The modern sheet, prepared-data and application contracts are not validated on Foundry 11. |

## Supported Baseline

- Manifest minimum: Foundry VTT 13.
- Manifest verified: Foundry VTT 13.
- Primary runtime target: Foundry VTT 13.351 with PF2e 7.8.0.
- PF2e is required. Prepared collections and public document APIs are preferred;
  unavailable capabilities fall back to the original PF2e sheet or a read-only
  summary.
- Existing Actor data, flags, macros and aliases are preserved when upgrading the
  module. Raising the install minimum does not migrate or delete world data.

## Foundry Type Definitions

The compile-time package remains
`@league-of-foundry-developers/foundry-vtt-types@12.331.5`. This is an intentional
temporary mismatch: runtime guards and local declarations cover the Foundry 13
surface currently used, while forcing the available type-package change during a
stabilization release would also replace transitive editor definitions. Runtime
compatibility is determined by the matrix above, not by the type package alone.

## Validation Levels

- **Automated tested:** typecheck, unit and integration tests, production build,
  manifest validation and distribution import validation.
- **Foundry tested:** interaction in a running world using real PF2e documents.
- **Multiplayer tested:** independent browser sessions with the named GM/player
  roles, never a GM preview represented as a player.
- **Build only:** the module packages, but campaign behavior is not claimed.

## Policy

Only combinations with meaningful runtime QA are declared supported or verified.
Legacy fallback code may remain to protect existing data and ease diagnostics,
but its presence is not a support claim.
