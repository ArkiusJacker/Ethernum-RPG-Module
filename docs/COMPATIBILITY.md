# Compatibility Matrix

This matrix separates declared manifest compatibility from combinations exercised by the project. The module remains a UI and controller layer over a single PF2e Actor; native PF2e rules and prepared data remain authoritative.

| Foundry VTT | PF2e | Status | Test level | Notes |
| --- | --- | --- | --- | --- |
| 13.351 | 7.8.0 | Primary | Automated suite and campaign smoke tests | Development and campaign baseline for v3.7.3. Character sheets, PF2e prepared data, unique mechanics, chat, tracker, and GM controls are validated here. |
| 14 | Compatible PF2e release | Experimental | Build and manifest validation only | The manifest declares Foundry 14 compatibility, but a complete campaign smoke test is still pending. Use a backup world and verify PF2e compatibility before upgrading. |
| 12 | Compatible PF2e release | Legacy | Automated compatibility paths only | The code retains Application V1 and guarded API fallbacks. No full v3.7.3 campaign pass is claimed. |
| 11 | Compatible PF2e release | Unverified | Not tested for v3.7.3 | The manifest minimum is preserved for existing worlds, but newer Foundry/PF2e APIs may not exist. Foundry 13 is recommended. |

## Supported Baseline

- Primary development target: Foundry VTT 13.351 with PF2e 7.8.0.
- Type definitions: Foundry VTT 12 declarations, supplemented by guarded runtime detection for newer APIs.
- PF2e is required. Prepared collections and public document APIs are preferred; unavailable capabilities fall back to the original PF2e sheet or a read-only summary.
- Existing character data, flags, macros, and aliases are preserved across sheet modes.

## Validation Levels

- **Automated suite:** type checking, unit and integration tests, production build, manifest validation, and distribution import validation.
- **Campaign smoke tests:** manual interaction in a running Foundry world using real PF2e Actors.
- **Build only:** the module compiles and packages, but the complete runtime workflow was not exercised on that Foundry/PF2e pair.

## Compatibility Policy

The manifest currently declares Foundry 11 through 14. That range is not equivalent to equal test coverage. A future release may raise the minimum only after an explicit API audit, migration review, and notice to world owners. Until then, Foundry 11 and 12 remain best-effort compatibility paths rather than tested campaign targets.
