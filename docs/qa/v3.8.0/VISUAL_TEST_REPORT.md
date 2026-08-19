# v3.8.0 Visual Test Report

Date: 2026-08-19

Environment: Foundry VTT local world, authenticated ChatGPT Gamemaster session

Module source: local production build installed into the Foundry module directory

## Scenarios

| Scenario | Result | Evidence |
| --- | --- | --- |
| Launcher opens the physical device | Pass | Lifecycle observed as `opening`, then `open`; `ethc-device-open` active |
| Short authentication sweep | Pass | Session reopen used `short`; `ethc-auth-sweep` active and boot reached `ready` |
| Power button Z-Flip shutdown | Pass | `closing/power`, `ethc-screen-power-down`, `ethc-fold-top` and launcher return confirmed |
| Current screen restoration | Pass | `Sheet` panel reopened after a full shutdown/reopen cycle |
| Boot interaction boundary | Pass | Header, viewport and footer were inert while boot was active |
| Footer/navigation | Pass | Five GM actions visible without horizontal navigation in the tested window |
| Viewport containment | Pass | 520 x 682 device stayed inside the 1523 x 1318 browser viewport |
| Phone-narrow clamp | Automated pass | 320 x 568 viewport contract resolves to a 304 x 552 device |
| Player permission boundary | Automated pass | Non-GM snapshot omits admin registry, preview users, private targets and administration panel |

Direct viewport mutation is intentionally blocked by the in-app browser's
read-only page evaluator. Compact ranges are therefore covered by deterministic
layout tests and container-query assertions rather than an artificial DOM edit.

## Evidence

- `01-communicator-boot.png`: launcher-to-device authentication state.
- `02-communicator-home.png`: authenticated home with stable footer.
- `03-zflip-shutdown.png`: power-down fold in progress.
- `04-opening-sweep.png`: short authentication sweep on reopen.

## Bugs Discovered During Development

### Permission metadata exposure

Area: Field Communicator snapshot

Bug: Player snapshots included GM registry targets and administrative preview metadata.

Severity: P1 - High

Requested originally: No

Fixed: Yes

Validation: Dedicated non-GM service test and panel authorization test.

### Detached controller race

Area: Overlay mount lifecycle

Bug: A delayed mount could attach after its host had been replaced or minimized.

Severity: P1 - High

Requested originally: No

Fixed: Yes

Validation: Sequence token, host identity and connection checks plus lifecycle tests.

### Direct panel navigation

Area: Communicator navigation

Bug: A caller could request an internal panel not present in the authorized snapshot.

Severity: P1 - High

Requested originally: No

Fixed: Yes

Validation: Controller test confirms rejection and access-denied state.

### Compact viewport overflow

Area: Overlay sizing and footer

Bug: The previous minimum size could exceed a 320 px viewport and the footer used horizontal scrolling.

Severity: P2 - Medium

Requested originally: Yes

Fixed: Yes

Validation: 320 x 568 clamp test and responsive CSS contract.
