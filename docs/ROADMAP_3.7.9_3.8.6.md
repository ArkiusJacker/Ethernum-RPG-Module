# Ethernum RPG Module — Master Development Roadmap

## v3.7.9 → v3.8.6

Repository:

`ArkiusJacker/Ethernum-RPG-Module`

Starting base:

`v3.7.8`

Implement the following releases **sequentially**:

```text
v3.7.9
↓
release
↓
v3.8.0
↓
release
↓
v3.8.1
↓
release
↓
v3.8.2
↓
release
↓
v3.8.3
↓
release
↓
v3.8.4
↓
release
↓
v3.8.5
↓
release
↓
v3.8.6
```

Do NOT implement all versions and publish only one final release.

Each version must:

1. be completed;
2. be tested;
3. be visually inspected when possible;
4. receive its own version bump;
5. receive its own commit;
6. be pushed;
7. receive its own tag;
8. receive its own GitHub Release;
9. pass validation before work on the next version begins.

---

# 0. PRIMARY DEVELOPMENT PRINCIPLE

The module is no longer in a phase where passing TypeScript tests alone is sufficient.

From this roadmap onward, every release must consider four independent quality layers:

```text
ARCHITECTURE
+
PF2E PARITY
+
FUNCTIONAL QA
+
VISUAL QA
```

A feature is not complete merely because:

```text
it compiles
```

or:

```text
the button exists
```

or:

```text
the asset exists in the DOM
```

It must work correctly inside Foundry and produce a satisfactory result.

---

# 1. TOKEN / INVESTIGATION POLICY

Do NOT reduce investigation quality merely to save tokens.

The agent is explicitly authorized to:

- inspect additional files;
- trace call chains;
- compare old/new implementations;
- inspect PF2e prepared data;
- inspect templates;
- inspect CSS;
- inspect runtime services;
- inspect tests;
- inspect unrelated visible areas for regressions;
- add tests;
- refactor locally when clearly necessary.

Use as many reasoning/code-analysis tokens as necessary to complete the task properly.

Do not prematurely conclude:

> “out of scope”

when a clearly visible bug is discovered in a directly related system.

---

# 2. ZERO-KNOWN-REGRESSION RELEASE GATE

Absolute perfection cannot be proven automatically.

However, releases MUST NOT knowingly ship with:

- P0 bugs;
- P1 bugs;
- reproducible broken core interactions;
- known PF2e parity regressions;
- broken layouts visible during QA;
- data duplication;
- incorrect rolls;
- incorrect currency;
- incorrect MAP;
- broken inventory actions;
- broken HP synchronization;
- scroll-reset regressions;
- obvious asset distortion.

If a bug is discovered during implementation:

FIX IT.

Do not leave a known visible bug untouched simply because it was not in the original task.

---

# 3. TESTE PROTOCOL — VERY IMPORTANT

The agent is allowed to create additional improvements not explicitly requested.

However:

> EVERY unsolicited feature or visual experiment MUST be explicitly classified as `TESTE`.

This is required so the user can distinguish:

```text
USER-DESIGNED / CANONICAL
```

from:

```text
AGENT-PROPOSED / EXPERIMENTAL
```

---

# 4. TESTE CLASSIFICATION

Anything added beyond the explicit roadmap must appear in the final report as:

```text
[TESTE]
```

Examples:

```text
[TESTE] alternate HP glow
[TESTE] experimental app transition
[TESTE] optional tactical warning
[TESTE] suggested shop sorting
```

---

# 5. TESTE FEATURE FLAGS

When an unsolicited addition changes behavior rather than only harmless polish, prefer placing it behind an experimental setting.

Suggested architecture:

```ts
interface EthernumExperimentalFeature {
  id: string;
  label: string;
  enabledByDefault: boolean;
  description: string;
}
```

Default:

```text
OFF
```

unless the experiment is purely harmless presentation.

---

# 6. TESTE DOCUMENTATION

Create/update:

```text
docs/EXPERIMENTAL_TESTS.md
```

Each experimental addition must document:

```text
ID
Version introduced
Area
Reason
Default state
How to test
How to disable
Whether it should become canonical
```

---

# 7. CHANGELOG RULE

Explicit requested work:

```text
Added
Changed
Fixed
```

Unrequested additions:

```text
TESTE
```

Never mix both silently.

---

# 8. FOUNDRY VERIFICATION PROTOCOL

For every release, perform real Foundry validation whenever the execution environment supports running Foundry/browser interaction.

Required distinctions in the final report:

```text
AUTOMATED TESTED
BROWSER TESTED
FOUNDRY TESTED
VISUALLY VERIFIED
USER VALIDATION REQUIRED
```

Never claim:

```text
VISUALLY VERIFIED
```

when only code/tests were inspected.

---

# 9. VISUAL QA

When Foundry can be opened, interact with the actual interface.

Capture/check at least:

```text
1200px
1000px
800px
650px
```

and where relevant:

```text
80%
100%
125% zoom
```

Inspect:

- clipping;
- overlap;
- tiny UI;
- distorted assets;
- incorrect images;
- incorrect states;
- scroll jumps;
- stale data;
- animation behavior;
- controls hidden behind ornaments.

---

# 10. PF2E SOURCE OF TRUTH

The Ethernum and Concórdia sheets remain alternative user interfaces over the same PF2e Actor.

Never duplicate mechanical state for convenience.

This includes:

```text
HP
Temporary HP
AC
Perception
Saves
Skills
Strikes
MAP
Damage
Critical Damage
Conditions
Items
Currency
Bulk
Feats
Spells
Spell Slots
Focus
Hero Points
Inventory
Carry State
Investment
```

Prefer:

```text
PF2e prepared Actor data
+
PF2e public/prepared actions
```

over manual reconstruction.

---

# 11. NEW CROSS-RELEASE SERVICE: PF2E PARITY AUDIT

Create:

```text
PF2eCharacterParityAudit
```

It should assist diagnostics with a comparison between:

```text
PF2e Prepared Actor
vs
Ethernum Presentation Snapshot
```

Relevant categories:

```text
HP
AC
Perception
Saves
Skills
Strikes
MAP
Inventory
Currency
Bulk
Conditions
Hero Points
Focus
Spellcasting
```

The service should NEVER modify data.

It exists for diagnostics.

---

# 12. DIAGNOSTIC MISMATCH

If a mismatch is detected:

```text
Skill Athletics
PF2e: +14
Ethernum: +12
```

Diagnostics should make it visible to the GM.

This is especially important during this development arc.

---

# =========================================
# v3.7.9
# ETHERNUM VISUAL HARDENING + PF2E PARITY
# =========================================

# 13. RELEASE OBJECTIVE

v3.7.9 is a stabilization release.

Focus:

```text
HP
Assets
Inventory
Currency
Combat
MAP
Visible regressions
Profile micro-animations
```

Do NOT begin major new Communicator systems yet.

---

# 14. P0 — HP BAR REBUILD

Remove the current geometry where the HP bar depends on a nested container with an oversized width such as:

```text
303%
```

The HP track must become an independent layer directly anchored to the HP Monitor.

Structure:

```text
HP MONITOR
├── frame
├── values
├── ECG
└── HP track
    └── HP fill
```

---

# 15. HP TRACK

Target concept:

```css
.eth-hp-track {
  position: absolute;
  left: <asset-safe-left>;
  right: <asset-safe-right>;
  bottom: <asset-safe-bottom>;
}
```

The fill should use:

```css
transform: scaleX(var(--ecs-hp-ratio));
transform-origin: left center;
```

No percentage multiplication hack.

---

# 16. HP IMMEDIATE FEEDBACK

When the HP input changes:

the visual bar should update immediately.

Do not wait for an unnecessary complete Actor rerender before visual feedback occurs.

Then reconcile against PF2e Actor state after the update.

---

# 17. HP DESYNC SAFETY

After Actor update:

```text
displayed HP
displayed ratio
PF2e Actor HP
```

must converge.

If the PF2e update rejects/clamps the value:

the UI must update to the canonical Actor value.

---

# 18. ECG HEARTBEAT

Implement a real CSS/SVG heartbeat.

Suggested states:

```text
FULL / HEALTHY
~1.25–1.4 sec

STABLE / INJURED
~0.9–1.1 sec

CRITICAL
~0.55–0.75 sec

0 HP
flatline or extremely slow pulse
```

---

# 19. ECG ANIMATION

Prefer:

```text
stroke-dasharray
stroke-dashoffset
opacity
filter
small transform
```

Do not flash the entire sheet.

---

# 20. HP MOTION SETTINGS

Heartbeat must respect:

```text
Full Motion
Reduced Motion
Off
prefers-reduced-motion
```

Reduced:

very subtle pulse.

Off:

static ECG.

---

# 21. DAMAGE FEEDBACK

Damage:

```text
short red pulse
HP fluid retracts
ECG reacts
frame receives temporary danger glow
```

No permanent flashing.

---

# 22. HEALING FEEDBACK

Healing:

```text
brief cyan/green response
fluid advances
ECG stabilizes
```

---

# 23. P0 — ORNAMENTAL DIVIDERS

Audit:

```text
ETH-UI-02
ETH-UI-13
```

They must NOT be compressed using arbitrary:

```text
100% 100%
```

if it destroys their aspect ratio.

---

# 24. ETH-UI-13

Preserve the actual art proportion.

Prefer:

```text
object-fit: contain
```

or controlled width with automatic height.

The divider must look like an actual ornament.

Not a crushed golden line.

---

# 25. ETH-UI-02

Audit every location where the Panel Edge is currently rendered as:

```text
9px
18px
etc.
```

If that scale destroys visible ornamentation:

replace with a correct modular composition.

---

# 26. ASSET USAGE AUDIT

Audit every canonical asset:

```text
ETH-UI-01
ETH-UI-02
ETH-UI-03
ETH-UI-04
ETH-UI-05
ETH-UI-06
ETH-UI-07
ETH-UI-08-A
ETH-UI-08-B
ETH-UI-09
ETH-UI-10
ETH-UI-11
ETH-UI-12
ETH-UI-13
```

For each:

```text
Loaded?
Used?
Visible?
Correct size?
Correct aspect?
Correct location?
Actually useful?
```

---

# 27. P0 — INVENTORY CURRENCY

The new sheet currently needs an explicit currency presentation.

Coins/currency must NOT appear as ordinary equipment/treasure rows when PF2e considers them currency.

Create:

```text
CharacterCurrencySnapshot
```

Example:

```ts
interface CharacterCurrencySnapshot {
  pp: number;
  gp: number;
  sp: number;
  cp: number;

  available: boolean;
}
```

---

# 28. PF2E CURRENCY SOURCE

Read currency from the PF2e Actor/inventory prepared source when available.

Do NOT maintain:

```text
ethernumCurrency
```

as duplicate mechanical data.

---

# 29. INVENTORY PRESENTATION

Add a dedicated:

```text
CURRENCY / FUNDOS
```

area.

Example:

```text
PP  1
GP  37
SP  6
CP  2
```

or equivalent localized display.

---

# 30. COIN ITEM FILTER

If PF2e internally represents coinage through Treasure documents:

recognize actual coinage appropriately and prevent those documents from appearing as generic inventory entries.

Do not hide non-currency Treasure items.

---

# 31. TREASURE

Treasure remains a valid inventory category.

Difference:

```text
coins/currency
≠
other treasure
```

---

# 32. CURRENCY TESTS

Test:

```text
0 currency
only GP
mixed denominations
adding coins
spending coins
loot coins
PF2e original sheet → custom sheet
custom sheet → PF2e original sheet
```

Values must remain identical.

---

# 33. P0 — STRIKE MODIFIER / MAP

The custom Combat tab must display exactly the prepared PF2e Strike variants.

Do not manually guess:

```text
first modifier
MAP2
MAP3
```

if prepared variants are available.

---

# 34. STRIKE VIEW MODEL

Create stronger representation:

```ts
interface CharacterStrikeVariantSnapshot {
  index: number;
  label: string;
  modifier: number;
  mapStage: 0 | 1 | 2;
}
```

---

# 35. PREPARED VARIANTS

Read the actual prepared Strike variants supplied by PF2e.

Display:

```text
+14
+9
+4
```

or whatever PF2e currently prepares.

Do not assume:

```text
-5 / -10
```

because:

- agile weapons;
- feats;
- effects;
- penalties;
- statuses;
- custom rules;

may change MAP.

---

# 36. STRIKE DISPLAY

Suggested:

```text
Katana

1º ATAQUE  +14
MAP 1       +9
MAP 2       +4

[DANO]
[CRÍTICO]
```

Labels may be more compact depending on layout.

---

# 37. STRIKE QA

Test:

```text
normal weapon
agile weapon
unarmed
ranged
melee
buffed attack
frightened
multiple-attack modifier effects
weapon potency
custom PF2e modifiers
```

Compare against the original PF2e sheet.

---

# 38. STRIKE EXECUTION

Pressing each variant must execute the corresponding PF2e prepared variant.

Display and roll must reference the same prepared variant.

---

# 39. DAMAGE / CRITICAL

Continue using PF2e prepared damage callbacks.

Do not reconstruct damage formulas manually.

---

# 40. INVENTORY BROAD QA

While fixing inventory, inspect:

```text
Bulk
Carry Type
Held Hands
Armor
Shields
Containers
Investment
Consumables
Quantity
Treasure
Currency
Drag/Drop
```

Fix any reproducible visible mismatch discovered.

---

# 41. PROFILE MOTION PASS

Perform a SMALL visual animation improvement for existing profiles.

Do not rebuild mechanics.

Profiles:

```text
Pipping
Gyro
Bayle
Arkius
Yu
Charles
Atlas
```

---

# 42. PROFILE MOTION REGISTRY

Prefer central registry:

```text
ProfileMotionRegistry
```

with lightweight declarative profiles.

---

# 43. PIPPING

Possible subtle improvements:

```text
shadow breathing
expression color pulse
darkness ripple
small violet/red/black transitions
```

Preserve existing Grimório hover/canvas effects.

---

# 44. GYRO

Possible micro-motion:

```text
small rotational accent
spin ring
golden trail
```

No permanent aggressive spinning.

---

# 45. BAYLE

Possible:

```text
draconic heat pulse
ember line
short impact response
```

---

# 46. ARKIUS

Possible:

```text
core ember breathing
chain spark
solar/aether response
```

---

# 47. YU

Possible:

```text
impact pulse
focus ring
short rage response
```

---

# 48. CHARLES

Possible:

```text
vector line
containment pulse
small trajectory animation
```

---

# 49. ATLAS

Possible:

```text
divine eye pulse
fusion ring
subtle layered glow
```

---

# 50. PROFILE MOTION RULE

Animations:

- CSS/SVG first;
- short;
- restrained;
- no UI obstruction;
- no mechanical rerender dependency;
- Reduced Motion supported;
- Off supported.

---

# 51. TESTE PROFILE EFFECTS

Any additional profile effect not directly requested:

```text
[TESTE]
```

---

# 52. BUG SWEEP

Before release:

open every main Ethernum tab.

Inspect:

```text
Overview
Combat
Equipment
Magic
Feats
Ether
Runes
Unique
Effects
```

Also switch to original PF2e sheet and back.

Fix clearly reproducible P0/P1 issues discovered.

---

# 53. v3.7.9 ACCEPTANCE

Must include:

- HP bar synchronized;
- heartbeat working;
- divider compression fixed;
- canonical assets visibly audited;
- Currency separated from inventory items;
- Gold no longer displayed as generic item when it is actual coinage;
- Strike attack modifiers correct;
- actual prepared MAP variants correct;
- profile motion pass complete;
- no scroll reset;
- PF2e fallback intact.

---

# 54. v3.7.9 RELEASE

Suggested commit:

```text
Release v3.7.9 with PF2e parity hardening and Ethernum visual fixes
```

Publish/tag/release before v3.8.0.

---

# =========================================
# v3.8.0
# FIELD COMMUNICATOR MOTION & VISUAL PASS
# =========================================

# 55. OBJECTIVE

Improve the Field Communicator experience itself.

Focus:

```text
opening
closing
shutdown
microinteractions
navigation
asset infrastructure
visual polish
```

---

# 56. COMMUNICATOR OPEN SEQUENCE

Improve normal opening.

Suggested flow:

```text
launcher click
↓
device appears
↓
screen powers
↓
short authentication sweep
↓
current screen
```

Avoid replaying long boot every time unless configured.

---

# 57. Z-FLIP SHUTDOWN

Implement a closing animation inspired by a foldable / Z-Flip device.

The device should visually:

```text
screen dims
↓
UI powers down
↓
upper/lower halves begin folding
↓
device visually closes
↓
communicator becomes launcher
```

---

# 58. Z-FLIP IMPLEMENTATION

Prefer CSS 3D composition.

Possible structure:

```text
communicator
├── top visual half
├── bottom visual half
└── content
```

Use:

```text
perspective
transform-origin
rotateX / rotateY
clip-path
opacity
```

No canvas required.

---

# 59. SHUTDOWN DURATION

Full motion:

approximately:

```text
450–750ms
```

depending on visual result.

Reduced:

simple collapse/fade.

Off:

instant close.

---

# 60. POWER BUTTON

Power button should specifically trigger the shutdown sequence.

Close/X can use either the same sequence or a shorter variant.

---

# 61. SHUTDOWN STATE MACHINE

Prevent double clicks.

States:

```text
idle
opening
open
closing
minimized
```

Do not allow:

```text
open → close → open → close
```

race conditions within the same animation frame.

---

# 62. APP MICROINTERACTIONS

Add:

```text
hover circuit response
press depression
cyan confirmation pulse
badge appear
navigation transition
```

---

# 63. NAVIGATION MOTION

Forward:

```text
small slide left
```

Back:

```text
small slide right
```

No large mobile-app carousel movement.

---

# 64. NOTIFICATIONS

Notification badge:

```text
scale in
small glow
```

No continuous bouncing.

---

# 65. ACCESS DENIED

Short:

```text
red response
tiny controlled glitch
```

No screen-shaking spam.

---

# 66. COMMUNICATOR ASSET INFRASTRUCTURE

Prepare:

```text
COM-UI Asset Pack
```

Architecture only if final communicator assets have not yet been provided.

Create registry compatible with:

```text
ETH-UI
CON-UI
COM-UI
```

---

# 67. DO NOT INVENT CANONICAL IMAGE ASSETS

If the user has not supplied communicator assets:

do NOT generate fake canonical raster art.

Use existing CSS presentation/fallback.

Create asset slots and documentation.

---

# 68. COMMUNICATOR ASSET BIBLE

Extend:

```text
docs/UI_ASSET_BIBLE.md
```

with placeholder section:

```text
COMMUNICATOR ASSET PACK
```

clearly marked:

```text
AWAITING CANONICAL ASSETS
```

---

# 69. COMMUNICATOR RESPONSIVE QA

Test:

```text
Phone narrow
Phone wide
Tablet
Resized desktop window
```

---

# 70. v3.8.0 RELEASE

Suggested commit:

```text
Release v3.8.0 with Field Communicator motion and shutdown experience
```

---

# =========================================
# v3.8.1
# CONTRACT ARCHIVE + DOCUMENT VIEWER
# =========================================

# 71. OBJECTIVE

Turn:

```text
CONTRATOS
```

from a Journal-name filter into a real subsystem.

---

# 72. CONTRACT ARCHIVE SERVICE

Create:

```text
ContractArchiveService
```

---

# 73. CONTRACT RECORD

Suggested:

```ts
interface EthernumContractRecord {
  id: string;

  number: number;
  title: string;

  status:
    | "available"
    | "accepted"
    | "active"
    | "completed"
    | "failed"
    | "archived";

  location?: string;
  region?: string;

  difficulty?: string;
  grade?: string;

  supervisor?: string;

  coverImage?: string;

  journalUuid?: string;
  pdfPath?: string;

  informationFound?: number;
  informationTotal?: number;

  attachments?: EthernumContractAttachment[];

  visibility?: EthernumContractVisibility;
}
```

---

# 74. CONTRACT 01 EXAMPLE

Support the supplied:

```text
Contrato 01
Operação Manifesto 13
```

as the initial integration/reference contract.

The actual PDF remains the canonical report.

Structured metadata exists for fast UI listing.

---

# 75. CONTRACT APP HOME

Example:

```text
CONTRATOS

ATIVO
[ current contract ]

CONCLUÍDOS

CONTRATO 01
OPERAÇÃO MANIFESTO 13
NOTA S

[ABRIR]
```

---

# 76. CONTRACT DETAILS

Show metadata:

```text
Status
Location
Grade
Supervisor
Information Found
```

Then:

```text
LER RELATÓRIO
ANEXOS
DOSSIÊS
RECOMPENSAS
```

when available.

---

# 77. EMBEDDED DOCUMENT VIEWER

Create:

```text
CommunicatorDocumentViewer
```

Supported targets:

```text
PDF
Journal
Image
Threat dossier
Text document
```

---

# 78. PDF VIEWER

PDFs should open **inside the Communicator** when technically possible.

Required controls:

```text
previous page
next page
page X / Y
zoom -
zoom +
fit width
fit page
open externally
```

---

# 79. PDF FALLBACK

If embedded PDF rendering is unavailable:

show:

```text
Document cannot be rendered internally.
[OPEN DOCUMENT]
```

Never break the communicator.

---

# 80. CONTRACT PERMISSIONS

Contract visibility may depend on:

```text
player
agent
squad
rank
GM
explicit access
```

Foundry document permissions remain authoritative.

---

# 81. RESTRICTED ATTACHMENTS

Support restricted attachments independently from general contract access.

Example:

```text
Contract report → squad
Intelligence annex → specific agent
GM notes → GM only
```

---

# 82. CONTRACT PUBLISHER PREPARATION

Prepare APIs for the future GM Administrative Communicator:

```text
publish
archive
activate
complete
grant access
revoke access
```

Actual GM UI comes later.

---

# 83. v3.8.1 RELEASE

Suggested:

```text
Release v3.8.1 with Contract Archive and embedded document viewer
```

---

# =========================================
# v3.8.2
# COMPANY STORE + PF2E TRANSACTIONS
# =========================================

# 84. OBJECTIVE

Transform the current:

```text
request purchase → GM whisper
```

system into a functional Company Store.

---

# 85. COMPANY STORE SERVICE

Create:

```text
CompanyStoreService
```

---

# 86. STORE ENTRY

Suggested:

```ts
interface CompanyStoreEntry {
  id: string;

  itemUuid: string;

  priceOverride?: string;

  stock?: number;

  minimumRank?: number;

  allowedRegions?: string[];
  requiredFlags?: string[];

  transactionMode:
    | "automatic"
    | "approval";

  featured?: boolean;
}
```

---

# 87. ITEM SOURCE

Store entries reference real PF2e Items.

Do not duplicate complete Item data into store records.

---

# 88. SHOP UI

Display:

```text
image
name
level
rarity
price
stock
authorization
```

when available.

---

# 89. CURRENCY

Use the same PF2e currency source established in v3.7.9.

Never create:

```text
shopWallet
```

or duplicate player money.

---

# 90. AUTOMATIC PURCHASE TRANSACTION

Flow:

```text
click BUY
↓
resolve Item
↓
resolve current price
↓
validate permissions
↓
validate rank/region
↓
validate stock
↓
validate currency
↓
deduct PF2e currency
↓
create/add PF2e Item
↓
update stock
↓
audit
```

---

# 91. TRANSACTION CONSISTENCY

Prevent:

```text
money removed
+
item not received
```

or:

```text
item received
+
money not removed
```

Use transaction-like sequencing with rollback/recovery where appropriate.

---

# 92. DOUBLE PURCHASE

Disable transaction button while purchase is processing.

Generate transaction ID.

Ignore duplicate submissions.

---

# 93. APPROVAL PURCHASE

Special item:

```text
REQUEST
↓
GM queue
↓
approve / reject
```

Keep the existing request concept as fallback.

---

# 94. STORE AUDIT LOG

Record:

```text
transaction ID
actor
user
item
price
time
result
GM approval if applicable
```

---

# 95. STOCK

Support:

```text
unlimited
finite
out of stock
```

---

# 96. REGION

Support future restrictions such as:

```text
Stonesour only
```

without assuming all items use restrictions.

---

# 97. STORE TESTS

Mandatory:

```text
enough money
not enough money
0 money
mixed currency
stock 1
stock 0
double click
broken UUID
permission denied
approval purchase
automatic purchase
rollback failure
```

---

# 98. v3.8.2 RELEASE

Suggested:

```text
Release v3.8.2 with Company Store and PF2e currency transactions
```

---

# =========================================
# v3.8.3
# ADMINISTRATIVE COMMUNICATOR
# =========================================

# 99. OBJECTIVE

Create a dedicated GM operational device.

Not merely:

```text
player communicator + hidden buttons
```

It should feel like:

```text
ETHERNUM COMMAND DEVICE
```

or equivalent administrative terminal.

---

# 100. GM ACCESS

Only GM users can enter administrative mode.

Player DOM must not expose actionable GM controls.

---

# 101. ADMIN HOME

Suggested areas:

```text
OPERATIONS
CONTRACTS
SQUADS
INTELLIGENCE
STORE
REQUISITIONS
REWARDS
LOOT
THREAT TOOLS
BROADCAST
SYSTEM
```

---

# 102. CONTRACT PUBLISHER

GM can:

```text
create metadata
select Journal/PDF
publish
set status
grant access
archive
complete
```

---

# 103. SHOP MANAGER

GM can:

```text
add PF2e Item
set price override
stock
rank
region
automatic / approval
enable / disable
```

---

# 104. REQUISITION QUEUE

Requests from v3.8.2 appear here.

GM:

```text
approve
reject
inspect actor
inspect item
```

---

# 105. SQUAD MANAGER

Manage:

```text
Company Rank
Codename
Squad
Department
Operational Status
```

through existing CompanyIdentity architecture.

---

# 106. INTELLIGENCE MANAGER

Manage contract intelligence collectibles:

```text
0 / 5
1 / 5
...
5 / 5
```

and associated unlocks.

---

# 107. REWARD CONSOLE

Support GM-assisted distribution of:

```text
Items
Currency
XP metadata
EP metadata
Commendations
Contract rewards
```

Do not modify PF2e XP automatically unless explicitly confirmed.

---

# 108. EMERGENCY BROADCAST

GM may send:

```text
INFO
WARNING
CRITICAL
```

broadcast to Communicators.

Optional screen response.

---

# 109. TESTE — BROADCAST FX

Any extra dramatic full-screen broadcast effects must be labeled:

```text
[TESTE]
```

---

# 110. PLAYER PREVIEW

GM can preview:

```text
what Player X sees
```

but preview must not accidentally perform actions as that player.

---

# 111. ADMIN AUDIT

Important actions enter the Audit Log.

---

# 112. v3.8.3 RELEASE

Suggested:

```text
Release v3.8.3 with Ethernum administrative command communicator
```

---

# =========================================
# v3.8.4
# LOOT GENERATOR + ENCOUNTER ANALYZER
# =========================================

# 113. OBJECTIVE

Add deterministic GM operational generators.

First systems:

```text
Loot Generator
Encounter Analyzer
```

No AI required.

---

# 114. LOOT GENERATOR

Inputs:

```text
Party Level
Party Size
Encounter Level
Item Level Range
Rarity
Category
Treasure / Consumable / Permanent
Budget
Allowed Sources
```

---

# 115. SOURCE

Use real PF2e world/compendium Items.

Never fabricate a fake PF2e item that does not exist unless GM explicitly chooses a custom/manual result mode.

---

# 116. LOOT FILTERS

Support:

```text
level
rarity
type
traits
source pack
price
```

when data exists.

---

# 117. LOOT RESULT

Example:

```text
LOOT MANIFEST

2 × Consumable L4
1 × Permanent L5
42 gp
1 candidate special item

[REGENERATE]
[SEND TO LOOT ACTOR]
[CHAT]
```

---

# 118. LOOT SEED

Allow optional deterministic seed.

Useful for reproducing generated manifests.

---

# 119. LOOT ACTOR

If distributing to a Loot Actor:

use real Item creation.

No duplicated registry-only inventory.

---

# 120. ENCOUNTER ANALYZER

Read:

```text
party
player levels
enemy levels
current encounter
```

when available.

---

# 121. ANALYZER OUTPUT

Show:

```text
Expected difficulty
XP budget
Creature contribution
Party adjustment
Warnings
```

Prefer prepared/native PF2e encounter information when available.

---

# 122. DO NOT OVERRIDE PF2E

The analyzer is diagnostic.

It must not silently alter NPCs or party level.

---

# 123. TESTE GENERATORS

Any extra generator created opportunistically:

```text
[TESTE]
```

Examples:

```text
[TESTE] random operation codename
[TESTE] environmental complication
```

---

# 124. v3.8.4 RELEASE

Suggested:

```text
Release v3.8.4 with deterministic loot and encounter tools
```

---

# =========================================
# v3.8.5
# NPC UNIQUE MECHANIC GENERATOR
# =========================================

# 125. OBJECTIVE

Create an offline deterministic generator for simple but functional enemy Unique Mechanics.

No AI dependency.

---

# 126. INPUT ANALYSIS

Analyze NPC:

```text
level
traits
size
movement
strikes
attack types
damage types
spellcasting
resistances
weaknesses
immunities
actions
reactions
HP
AC
saves
```

---

# 127. ROLE CLASSIFICATION

Classify approximately:

```text
Brute
Skirmisher
Controller
Artillery
Defender
Support
Caster
Boss
Hybrid
```

Multiple roles may have weights.

---

# 128. TRAIT WEIGHTS

Examples:

```text
fire
dragon
electricity
undead
construct
swarm
shadow
water
air
plant
demon
```

should influence mechanics.

---

# 129. MECHANIC BUILDING BLOCKS

Create templates such as:

```text
AuraTemplate
ChargeTemplate
ReactionTemplate
CounterTemplate
MarkTemplate
ResourceTemplate
PhaseTemplate
FinisherTemplate
SummonTemplate
HazardTemplate
MovementTemplate
ZoneTemplate
EscalationTemplate
```

---

# 130. SIMPLE MECHANIC OUTPUT

Standard enemy:

```text
1 Passive
+
1 Trigger OR Active
```

---

# 131. ELITE OUTPUT

Elite:

```text
1 Passive
+
1 Active
+
1 Reaction/Trigger
```

---

# 132. BOSS OUTPUT

Boss candidate:

```text
Passive
+
Active
+
Reaction
+
Phase / Escalation
```

No forced complexity.

---

# 133. POWER BUDGET

Generated mechanics must be constrained.

Do not simply add free damage.

Use tradeoffs:

```text
cooldown
action cost
trigger
limited use
resource
telegraph
condition
position
HP threshold
```

---

# 134. PREVIEW FIRST

Never directly modify NPC after generation.

Flow:

```text
Generate
↓
Preview
↓
Edit
↓
Apply
```

---

# 135. APPLY

Use the existing public Unique Mechanic architecture/services.

Do not import:

```text
UniqueMechanicsKernel
UniqueMechanicsLegacy
```

from new generator UI.

---

# 136. ROLLBACK

Before applying:

snapshot custom mechanic state.

Allow:

```text
REVERT GENERATED MECHANIC
```

for the latest generated application.

---

# 137. GENERATOR ORIGIN

Store metadata:

```text
origin: deterministic-generator
generatorVersion
generatedAt
templateIds
```

so user-created mechanics remain distinguishable.

---

# 138. USER CONTENT PRESERVATION

Never overwrite manually authored mechanics without explicit confirmation.

---

# 139. TESTE TEMPLATES

New experimental template families must be:

```text
[TESTE]
```

until approved.

---

# 140. v3.8.5 RELEASE

Suggested:

```text
Release v3.8.5 with deterministic NPC unique mechanic generator
```

---

# =========================================
# v3.8.6
# OPTIONAL AI GENERATOR ADAPTER
# =========================================

# 141. OBJECTIVE

Add OPTIONAL AI assistance to the NPC mechanic generator.

The deterministic generator from v3.8.5 remains fully functional without AI.

---

# 142. PRINCIPLE

AI is:

```text
enhancement
```

not:

```text
dependency
```

---

# 143. AI PROVIDER INTERFACE

Create generic interface:

```ts
interface UniqueMechanicAIProvider {
  generate(
    input: UniqueMechanicGeneratorInput,
    options?: UniqueMechanicAIOptions
  ): Promise<UniqueMechanicDraft>;
}
```

The generator should not be tightly coupled to one UI component.

---

# 144. OPENAI ADAPTER

An OpenAI implementation may use a server-side integration with the OpenAI Responses API.

Do not couple the core generator to the provider.

---

# 145. NO API SECRET IN CLIENT

NEVER store or expose a provider API secret inside:

```text
browser JS
Foundry client bundle
world settings visible to clients
HTML
localStorage
```

The AI request must go through an appropriately secure server-side/proxy mechanism.

If no secure backend is configured:

AI mode remains unavailable.

---

# 146. STRUCTURED OUTPUT

AI output must validate against a strict application schema.

Suggested:

```ts
interface UniqueMechanicAIDraft {
  name: string;
  concept: string;

  passive?: MechanicComponent;
  active?: MechanicComponent;
  reaction?: MechanicComponent;
  phase?: MechanicComponent;

  reasoningSummary?: string[];
  warnings?: string[];
}
```

---

# 147. NEVER EXECUTE RAW MODEL OUTPUT

AI response:

```text
JSON
↓
schema validation
↓
mechanic validator
↓
power checks
↓
preview
```

Never:

```text
AI text
↓
eval()
```

Never execute arbitrary generated JavaScript.

---

# 148. AI INPUT

Send only required mechanical/narrative context.

Examples:

```text
NPC level
traits
attacks
damage types
role
existing actions
requested complexity
theme
```

---

# 149. AI MODES

Possible:

```text
Refine deterministic mechanic
Generate alternate draft
Name existing mechanic
Create narrative presentation
Suggest trigger
Suggest phase
```

---

# 150. RECOMMENDED DEFAULT

Best default workflow:

```text
deterministic generator
↓
AI refinement
↓
schema validation
↓
GM preview
```

rather than completely unconstrained generation.

---

# 151. GM APPROVAL

AI output is NEVER applied automatically.

Required:

```text
PREVIEW
EDIT
APPROVE
```

---

# 152. AI LABEL

All AI-generated content must visibly display:

```text
AI ASSISTED
```

and metadata.

---

# 153. AI AUDIT

Record:

```text
provider
model identifier
time
generator version
accepted/rejected
```

Do NOT record provider secrets.

---

# 154. FAILURE

If API request fails:

```text
AI unavailable
↓
deterministic generator remains available
```

No core functionality may break.

---

# 155. COST / REQUEST CONTROL

AI generation should be manual.

Never continuously call the provider on:

```text
sheet render
actor update
combat update
hover
```

Only explicit GM action.

---

# 156. TESTE AI FEATURES

The entire AI adapter begins classified as:

```text
[TESTE]
```

until approved by the user.

---

# 157. v3.8.6 RELEASE

Suggested commit:

```text
Release v3.8.6 with optional AI-assisted unique mechanic generation
```

---

# =========================================
# CROSS-RELEASE QA
# =========================================

# 158. REQUIRED CHARACTER TEST MATRIX

At minimum validate existing profiles:

```text
Pipping
Gyro
Bayle
Arkius
Yu
Charles
Atlas
```

---

# 159. PIPPING REGRESSION

Preserve:

```text
Grimório
Tier
Scaling
Destruição
Ordem
Caos
Pulso Sombrio
Noite Viva
Hover
Animations
Persistent Areas
Shadows
Approval
Audit
```

---

# 160. ETHERNUM SYSTEM QA

Test:

```text
Éter
FE
Runas
Fides
Fulgor
Company Identity
Company Rank
```

---

# 161. PF2E QA

Every relevant release should test:

```text
HP
Temp HP
AC
Perception
Fortitude
Reflex
Will
Skills
Initiative

Strike 1
Strike MAP1
Strike MAP2
Damage
Critical

Inventory
Currency
Bulk
Carry
Hands Held
Investment
Consumables
Containers
Treasure

Feats

Prepared spells
Spontaneous spells
Focus
Slots

Conditions
Effects
Hero Points
```

---

# 162. CUSTOM ↔ PF2E SYNC TEST

For important data:

```text
Change in custom sheet
↓
open original PF2e sheet
↓
same value
```

and:

```text
Change in PF2e sheet
↓
open custom sheet
↓
same value
```

---

# 163. COMMUNICATOR QA

From v3.8.0 onward:

```text
open
boot
close
Z-flip shutdown
minimize
launcher drag
launcher lock
resize
Phone
Tablet
Back
Recents
Settings
notifications
apps
```

---

# 164. CONTRACT QA

From v3.8.1:

```text
list
open
permissions
PDF
Journal
attachments
restricted attachment
archive
completed
broken document
```

---

# 165. STORE QA

From v3.8.2:

```text
catalog
currency
purchase
approval
stock
rollback
audit
```

---

# 166. ADMIN QA

From v3.8.3:

```text
GM access
player denial
player preview
contracts
shop manager
broadcast
requisitions
squad
intelligence
```

---

# 167. GENERATOR QA

From v3.8.4:

```text
loot determinism
invalid item filtering
encounter data
```

From v3.8.5:

```text
role detection
mechanic generation
preview
apply
rollback
manual mechanic preservation
```

From v3.8.6:

```text
AI disabled
AI unavailable
invalid JSON
schema failure
valid generation
GM reject
GM approve
provider error
```

---

# 168. BUG HUNT REQUIREMENT

During every Foundry QA session:

do not test only the newly changed button.

Spend part of QA visiting previously untouched areas.

Examples:

```text
Inventory
Combat
Feats
Magic
Unique
Effects
Communicator
PF2e fallback
```

Any clearly reproducible high-impact bug should be fixed before release.

---

# 169. BUG REPORT

Final report for each version must include:

```text
BUGS FOUND DURING DEVELOPMENT
```

with:

```text
Bug
Area
Was originally requested?
Fixed?
Test
```

---

# 170. TESTE REPORT

Also include:

```text
EXPERIMENTAL [TESTE] CHANGES
```

If none:

```text
None.
```

Never omit this section.

---

# 171. PERFORMANCE

Avoid expensive continuous observers.

Do not recompute:

```text
whole inventory
whole spellcasting
all generator logic
```

on unrelated mouse hover.

---

# 172. ERROR BOUNDARIES

A failing panel should not destroy:

```text
whole character sheet
whole communicator
whole GM device
```

Use local fallback when possible.

---

# 173. LOGGING

Production console should not be spammed.

Diagnostics can contain detailed logs.

---

# 174. SECURITY

Do not:

```text
eval arbitrary scripts
execute custom JavaScript from app definitions
trust model output
trust client permission checks alone
```

GM-only operations must validate permission at execution.

---

# 175. VERSIONING PER RELEASE

For every version update:

```text
module.json
package.json
package-lock.json
README.md
CHANGELOG.md
relevant docs
```

---

# 176. VALIDATION PER RELEASE

Run:

```text
npm ci
npm run typecheck
npm run test
npm run build
npm run validate:manifest
npm run validate:dist
```

Fix all failures.

---

# 177. DO NOT CONTINUE ON FAILED RELEASE

If v3.8.2 fails release validation:

DO NOT begin v3.8.3.

Fix v3.8.2 first.

---

# 178. TAG / RELEASE

Each version gets:

```text
commit
push main
tag
GitHub Release
module.json asset
ethernum-rpg-module.zip
```

Verify updater URLs.

---

# 179. FINAL REPORT PER VERSION

Required:

## Version

```text
vX.Y.Z
```

## Git

```text
Commit SHA
Tag
Release URL
```

## Validation

```text
typecheck
tests
build
manifest
dist
```

## Foundry

```text
Foundry tested?
PF2e version
Visual verification?
```

## Explicit requested work

List.

## Bugs found and fixed

List.

## TESTE

List every unsolicited/experimental addition.

## Known limitations

List honestly.

---

# 180. FINAL MASTER REPORT AFTER v3.8.6

After all releases, produce summary:

| Version | Main Focus | Tests | Foundry | Release |
|---|---|---|---|---|
| 3.7.9 | PF2e/visual hardening | | | |
| 3.8.0 | Communicator motion | | | |
| 3.8.1 | Contracts | | | |
| 3.8.2 | Store | | | |
| 3.8.3 | Admin Device | | | |
| 3.8.4 | Loot/Encounter | | | |
| 3.8.5 | NPC Mechanic Generator | | | |
| 3.8.6 | Optional AI | | | |

---

# 181. DO NOT IMPLEMENT YET

Unless required to fix regression:

```text
Concórdia Asset Fidelity Pack
Morgana
Unluck
Kaitake profile
Cinério/Umbra profile
Ailan profile
Rune Engine 2.0
full Chronicle System
```

Concórdia visual assets will receive a dedicated later release.

---

# 182. CORE DESIGN PRINCIPLE

The project should continue evolving toward:

```text
ONE PF2E ACTOR
+
MULTIPLE HIGH-QUALITY INTERFACES
+
ETHERNUM OPERATIONAL ECOSYSTEM
```

The Character Sheet is the detailed operative dossier.

The Field Communicator is the practical field interface.

The Administrative Communicator is the GM command terminal.

Contracts, Store, Loot, Intelligence and Unique Mechanics should interact with the same world state rather than becoming isolated mini-systems.

---

# 183. FINAL RULE

Quality takes priority over rushing version numbers.

Use the available token budget freely.

Inspect before assuming.

Test before declaring success.

If a visible bug appears during Foundry verification:

fix it.

If an extra improvement is invented by the agent:

mark it:

```text
[TESTE]
```

so the user always knows what was authored by the project direction and what was proposed experimentally by the implementation agent.