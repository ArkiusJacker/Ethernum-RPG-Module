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
