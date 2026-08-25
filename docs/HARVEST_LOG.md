# HARVEST Log

Development ideation sessions selected for implementation are documented here.

## HARVEST Session - Profile Motion Pass

Version target: 3.7.9  
Mode: Lite  
Execution: Multi-agent; Facilitator/Critic in the main implementation pass and a
separate Specialist implementation pass.

### Seed

Apply restrained motion identities to the seven existing character profiles while
preserving mechanics, accessibility preferences and render performance.

### Canonical Requirements

- A central `ProfileMotionRegistry`.
- CSS/SVG-first motion for Pipping, Gyro, Bayle, Arkius, Yu, Charles and Atlas.
- Full, Reduced, Off and operating-system reduced-motion support.
- No mechanical rerender dependency or obstruction of interaction.

### Harvest

Canonical:

- Declarative motion definitions with bounded scale, distance and duration.
- Existing profile markup as the animation target.
- Stable loading through the module base stylesheet.

Experiments harvested: None. The profile motion pass is an explicit v3.7.9
roadmap requirement.

Backlog: None.

Rejected:

- Aggressive continuous transforms and whole-sheet flashes because they would
  reduce readability and increase animation fatigue.

## HARVEST Session - Field Communicator Motion

Version target: 3.8.0

Mode: Full

Execution: Multi-agent; Facilitator in the main implementation pass plus
independent Specialist, Critic and Dreamer/Experience reviews.

### Seed

Give the Field Communicator a physical opening and shutdown language without
weakening permissions, accessibility, responsiveness or multiplayer safety.

### Canonical Requirements

- Launcher-to-device opening with a short authentication sweep.
- Z-Flip power shutdown with Full, Reduced and Off motion paths.
- Race-free `idle`, `opening`, `open`, `closing` and `minimized` states.
- Circuit hover, press, confirmation, badge and directional navigation feedback.
- Shared `ETH-UI`, `CON-UI` and `COM-UI` asset infrastructure without invented art.

### Harvest

Canonical:

- Tokenized lifecycle controller that ignores stale transition completions.
- Current-screen restoration after a shutdown and permission revalidation on reopen.
- Public player snapshots separated from GM registry metadata.
- CSS 3D fold composition and compact footer without horizontal navigation.

Experiments harvested: None. Every implemented interaction is an explicit v3.8.0
roadmap requirement or a confirmed security, lifecycle or accessibility fix.

Backlog:

- Agent-specific synchronization latch.
- Transmission seal after outgoing messages.

Rejected:

- Continuous device shake, bouncing badges and fictional `COM-UI` raster assets.

## HARVEST Session - Contract Archive and Embedded Viewer

Version target: 3.8.1

Mode: Full

Execution: Multi-agent; Facilitator in the main implementation pass plus
independent Specialist, Critic/Security and Experience reviews.

### Seed

Transform the Contracts placeholder into a persistent operational archive with a
safe in-communicator document reader, preserving Foundry permissions and legacy
world data.

### Canonical Requirements

- Contract archive grouped by operational status with detail and reward views.
- Canonical Contract 01 report and cover.
- Embedded PDF navigation, zoom, fit controls and explicit fallback.
- Support for Journal, image, dossier and text documents.
- GM-only lifecycle mutations and player-safe access rules.
- Idempotent migration of existing contract Journals.

### Harvest

Canonical:

- GM-only administrative Journal plus document-level Foundry projections.
- Independent attachment ACL and permission revalidation at every open.
- PDF.js canvas rendering with a strict static module path policy.
- Archive -> detail -> viewer navigation with local back-stack behavior.
- Revision conflicts and a single-active-contract invariant.

Experiments harvested: None. Every implemented feature is an explicit v3.8.1
roadmap requirement or a confirmed security, authority or migration safeguard.

Backlog:

- Dedicated administrative editing surface, scheduled for v3.8.3.
- Optional hiding/grouping of generated projection Journals in the directory,
  provided this can be done without weakening native Foundry ACL behavior.

Rejected:

- World settings or broadcast socket payloads containing the secret registry.
- Arbitrary document URLs, unrestricted iframes and executable Journal HTML.
- A second approval, audit or authority control plane.

## HARVEST Session - Company Store and PF2e Transactions

Version target: 3.8.2

Mode: Full

Execution: Multi-agent; Facilitator in the main implementation pass plus
independent Specialist, Critic/Security and Dreamer/Experience reviews.

### Seed

Replace the purchase-request placeholder with a real PF2e store while preventing
currency loss, Item duplication, secret catalog exposure and authority bypass.

### Canonical Requirements

- Catalog entries reference real PF2e Items and the real Actor currency source.
- Automatic and approval transactions with stock, Rank, region and flags.
- Idempotency, audit, rollback/recovery and double-click protection.
- Catalog, detail, processing and result presentation inside the Communicator.

### Harvest

Canonical:

- GM-only administrative Journal and per-user sanitized snapshot projections.
- Foundry-authored ChatMessage attestation bound to requester, Actor and quote.
- Persistent transaction stages, global serialization and deterministic recovery.
- Existing Authority Bridge, Approval Queue, policy and audit services as the only
  operational authority plane.
- Permission revalidation for the PF2e Item and exact assigned character.
- Foundry v14 document creation through the bound Journal document class rather
  than an unbound static method.
- Explicit support for zero-cost PF2e offers and content-sized catalog rows.

Experiments harvested: None. All implementation choices are roadmap requirements
or P0/P1 security and consistency safeguards needed to implement them safely.

Backlog:

- Diegetic store administration in the v3.8.3 Administrative Communicator.
- Optional user-facing confirmation step before automatic debit, provided later
  usability testing shows that detail-screen confirmation is insufficient.

Rejected:

- A separate wallet, approval queue, audit log or policy engine.
- Client-trusted Actor flags for Rank/region authorization.
- Raw Item UUIDs, restrictions or transaction records in player projections.
- Automatic recovery from an ambiguous debit or interrupted compensation.

Foundry harvest:

- The first authenticated render exposed overlapping catalog metadata; the
  corrected render is preserved beside the defect screenshot.
- Primary-GM initialization exposed an unbound `JournalEntry.create` failure in
  Foundry v14. Store and Contract storage now share the corrected invocation
  pattern and a regression test.
- Automatic and approval transactions were executed against a real assigned
  PF2e Actor. Temporary Items, catalog records, transactions, messages and QA
  macro data were removed after verification.

## HARVEST Session - Administrative Communicator

Version target: 3.8.3

Mode: Full

Execution: Multi-agent; Facilitator in the main implementation pass plus
independent Specialist, Critic/Security and Experience reviews.

### Seed

Create a dedicated GM operational device without duplicating the existing
authority, requisition and audit control plane.

### Canonical Requirements

- GM-only command terminal with operational domain navigation.
- Contract, Store, squad, intelligence, reward and broadcast management.
- Player preview that cannot execute actions as the selected player.
- Important administrative operations in the existing Audit Log.

### Harvest

Canonical:

- The existing GM Control Center evolved into `ETHERNUM COMMAND DEVICE`; the
  player Communicator registry remains a separate application manager.
- One audited administrative command facade delegates to the existing Contract,
  Store, Authority Bridge and Company Identity ownership boundaries.
- Company identities moved to a GM-only Journal with safe legacy migration and
  per-user projections; player Actor flags are no longer an authorization source.
- Reward ledger uses persistent idempotent stages and compensating rollback.
- Broadcasts use Foundry-authored ChatMessages and native whisper recipients.
- Player preview is visually explicit, fail-closed and globally read-only.

Experiments harvested: None. Every implemented feature is an explicit v3.8.3
requirement or a P0/P1 security and consistency safeguard required by it.

Backlog:

- Loot and Threat areas become functional in v3.8.4 rather than shipping as
  inert v3.8.3 placeholders.
- Move legacy Authority Bridge queue/audit storage from world settings to a
  private GM Journal in a future compatible migration.

Rejected:

- A second GM approval queue, audit log or authority engine.
- Trusting client-editable Company Rank flags.
- Automatic PF2e XP mutation without an explicit confirmation workflow.
- `[TESTE]` full-screen emergency broadcast effects in this release.

Foundry harvest:

- A persisted `8px/8px` position placed the Command Device behind the open Field
  Communicator. The final implementation detects that collision and repositions
  the administrative device without raising it above native Foundry windows.
- Player preview initially retained the GM controller when the Field
  Communicator was already open. Entering and leaving preview now remounts the
  controller against the selected subject and restores the GM DOM afterward.
- Deleting a broadcast removed its ChatMessage but left the administrative list
  stale. Broadcast-tagged ChatMessage changes now refresh both communicators.
- Two temporary INFO broadcasts were created and deleted. Existing Contracts,
  Store, identity and Actor data were inspected without mutation.

## HARVEST Session - Deterministic Loot and Encounter Tools

Version target: 3.8.4

Mode: Full

Execution: Independent Facilitator, Specialist, Critic/Security and Experience
passes in the main implementation. Three auxiliary-agent attempts reached the
session usage limit before producing code; no agent output was represented as a
review.

### Seed

Add deterministic operational generation and encounter diagnostics without
inventing PF2e documents, mutating the world during preview or bypassing the
existing administrative authority plane.

### Canonical Requirements

- Loot preview sourced from real world and compendium Items.
- Configurable level, rarity, category, type, trait, source and budget filters.
- Optional deterministic seed and exact currency remainder.
- Explicit, audited delivery to a PF2e Loot Actor and publication to chat.
- Read-only encounter difficulty, XP budgets, contributions and warnings.

### Harvest

Canonical:

- Pure seeded generator and encounter analyzer kept separate from Foundry UI.
- Lightweight compendium indexes rather than loading every Item document during
  candidate filtering.
- Persistent GM-only loot ledger with idempotent application and compensation.
- Existing Administrative Communicator and Authority Bridge as the only mutation
  path; previews remain client-local and ephemeral.
- Official relative-level XP table with party-size budgets, native prepared XP
  preference and explicit warnings outside the supported range.
- Responsive Loot and Encounter areas with full provenance and budget display.

Experiments harvested: None. No opportunistic generator was added.

Backlog:

- A dedicated recovery/reconciliation UI for interrupted loot deliveries if
  real-world testing ever produces a `recoveryRequired` record.
- Modern ApplicationV2 replacement for the shared legacy Dialog helper.

Rejected:

- Fabricated PF2e Items, automatic NPC balancing and silent party-level edits.
- Client Actor flags as the authoritative transaction ledger.
- Scanning every Item pack by default when the world and Equipment sources are
  sufficient for normal generation.

Foundry harvest:

- The secondary `ChatGPT Gamemaster` exposed a read path that incorrectly
  required primary-GM authority and prevented the entire Command Device from
  mounting. Secondary GMs may now read the administrative Store while all writes
  remain primary-only.
- Late restoration of the Field Communicator could occur after the one-time
  collision check. A MutationObserver and bounded delayed checks now keep both
  devices separated after open, drag, resize and reload.
- The authenticated Equipment index produced 1,105 valid candidates in roughly
  0.5 seconds. No Loot Actor existed in the test world, so real delivery was
  verified transactionally in tests and the live world was left unchanged.
- The current combat (one level-3 character against a level-13 Adamantine Dragon)
  was diagnosed as beyond extreme with the expected out-of-range warning.

## HARVEST Session - Deterministic NPC Unique Mechanics

Version target: 3.8.5

Mode: Full

Execution: Facilitator, architecture, PF2e integration, security and experience
passes were performed in the main implementation and verified independently by
focused architecture and transaction tests.

### Seed

Create useful enemy mechanics from existing PF2e NPC data without AI, runtime
profile registration, arbitrary code or preview-time world mutation.

### Canonical Requirements

- Analyze the complete combat-facing NPC shape and classify weighted roles.
- Generate deterministic Standard, Elite and Boss compositions from constrained
  experimental templates.
- Enforce a visible power budget and meaningful action, trigger, cooldown,
  telegraph, resource, positioning or HP-threshold tradeoffs.
- Preview and text-edit before an explicit audited application.
- Preserve authored profile mechanics and support one-step generated rollback.

### Harvest

Canonical:

- A standalone declarative schema and strict validator remain outside the static
  `UniqueMechanicProfileId` union and the legacy/kernel implementations.
- Thirteen `[TESTE]` template families are pure builders over normalized PF2e NPC
  analysis; a stable seed and Actor fingerprint reproduce the same definition.
- Standard, Elite and Boss budgets reserve the minimum cost of later components,
  preventing a strong early choice from overspending the final composition.
- Generated Items are ordinary PF2e Actions with safe inline checks/damage and
  module ownership flags, never executable macro source.
- Application revalidates Actor identity and fingerprint, snapshots generated
  state, preserves manual Items and compensates partial failures.
- Administrative apply/revert reuse the existing Authority Bridge and audit path.

Experiments harvested: All thirteen new template families remain explicitly
marked `[TESTE]` pending campaign feedback.

Backlog:

- Replace the shared Foundry V1 Dialog helper with ApplicationV2 without coupling
  that migration to generator rules.
- Promote individual template families only after encounter telemetry and GM
  review establish stable tuning.

Rejected:

- Dynamic authored-profile registration, arbitrary JavaScript, generated macro
  text, silent Actor mutation and unbounded free damage.
- AI as a dependency of deterministic generation.
- Reading journals, conversations or unrelated world documents as NPC context.

Foundry harvest:

- The live Adamantine Dragon produced a reproducible Boss composition with four
  components and a complete 9/9 power budget.
- PF2e 7.5 reported the legacy `system.attributes.speed` getter. Analysis now uses
  prepared `system.movement.speeds` and a raw-source-only compatibility fallback;
  the warning disappeared on the repeated smoke test.
- The final four-column metric strip removed an inherited empty fifth column and
  retained readable cards at the current Command Device size.
- Live apply/revert could not complete while the active primary GM retained the
  previous bundle; the secondary GM correctly waited for authority. Transactional
  tests cover completed apply, duplicate apply, revert, manual restoration and
  compensating rollback, and the live world was left without generated changes.

## HARVEST Session - Optional AI Assistance

Version target: 3.8.6

Mode: Full

Execution: Facilitator, architecture, data-boundary, security, PF2e integration
and experience passes were performed in the main implementation. Focused tests
independently exercise provider failures, hostile output, permissions and the
approval boundary.

### Seed

Allow optional AI refinement of deterministic NPC mechanics without making AI a
dependency, exposing provider credentials or sending private Foundry content.

### Canonical Requirements

- Preserve the complete offline and deterministic v3.8.5 workflow.
- Keep provider transport generic and require an appropriately secure server-side
  proxy before the feature can become available.
- Send only the minimum mechanical and narrative NPC context.
- Validate strict JSON, schema, mechanical invariants and power limits before
  showing a proposal.
- Require explicit GM request, preview, optional text edit and approve/reject.
- Label assisted content and audit provider, model, version, time and decision
  without recording secrets.

### Harvest

Canonical:

- The deterministic definition is always generated first and remains the source
  of structure, operations, costs, damage, DC and power budget.
- A provider must declare `secure-server-proxy` transport and that it exposes no
  client secret before registration is accepted.
- The data boundary is a named, testable projection that excludes Journals,
  private messages, GM notes, unrelated Actors, inventories, world exports and
  credentials.
- Provider output is limited to 64 KB, parsed as strict JSON, rejects unknown
  fields and can patch only text slots already present in the deterministic base.
- Pending AI proposals cannot be applied. Acceptance is checked again by the
  mutation service, outside the UI.
- Failures are local to the assistance request and preserve the deterministic
  preview.

Experiments harvested:

- `[TESTE - AI]` generic provider architecture, proposal workflow, audit and UI.
- The experiment is visible but unavailable by default because this repository
  contains no approved secure backend.

Backlog:

- Implement and deploy a separately secured server-side provider adapter only
  after its authentication, rate limit, retention and privacy policy are approved.
- Evaluate model quality and operating cost before promoting any part of the AI
  workflow from experimental status.

Rejected:

- Browser-side API keys, direct OpenAI calls, secrets in world settings or local
  storage, unrestricted model-generated components and executable output.
- Automatic calls during render, Actor updates, combat updates or hover.
- Reading Journals, conversations, secret notes or full world state for flavor.
- Automatically applying a model response or treating UI permission as the only
  authority check.

Foundry harvest:

- With no provider registered, `NPC Mechanics` displayed the unavailable state,
  the security explanation and the expandable data-boundary list; the refinement
  command remained disabled while deterministic generation stayed usable.
- The panel remained readable at the current Command Device size without overlap.
- Cross-release inspection opened Store, Field Communicator Settings and the
  original PF2e Inventory, Actions and Effects tabs without module errors.
- No new reproducible bug was found during the v3.8.6 live pass.

## HARVEST Session - Repository Integrity and PF2e Parity

Version target: 3.8.7

Mode: Lite

Seed: consolidate release truth and character-sheet mechanical parity without
adding gameplay systems.

Canonical harvest:

- Repair `main` by fast-forward before feature work and preserve every published
  release commit.
- Enforce tag ancestry in the release workflow with a pure, testable topology
  evaluator.
- Compare prepared PF2e values with the Ethernum presentation snapshot without
  deriving MAP, comparing localized labels or mutating documents.
- Preserve a mechanical `traditionSlug` beside localized spellcasting text to
  avoid false parity mismatches.
- Declare compatibility according to runtime evidence rather than dormant
  fallback code.
- Register the three existing experiments with stable HARVEST IDs and retain
  `AWAITING_USER_APPROVAL`.

Experiments harvested: None. All changes are explicit consolidation requirements
or defects uncovered by their validation.

Backlog:

- Full current Foundry 14 campaign sweep before considering it verified.
- Administrative GitHub branch protection configuration by a repository owner.

Rejected:

- Deriving MAP penalties, repairing Actor data from diagnostics, claiming Foundry
  11/12 support from compilation alone and force-upgrading Foundry typings.

Foundry harvest: completed on Foundry 13.351 / PF2e 7.8.0 with ChatGPT
Gamemaster, Bayle and Pipping sessions. The live pass found and fixed one false
spellcasting parity mismatch caused by empty PF2e rank containers. Player
startup also exposed an administrative Rewards read attempted without GM
authority; this is retained as a confirmed v3.8.8 reliability item.
