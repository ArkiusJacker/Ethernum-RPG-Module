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
