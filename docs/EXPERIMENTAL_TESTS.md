# Ethernum Experimental Tests

Experimental features proposed through HARVEST are tracked here. A feature is
not canonical merely because it is present in a release.

## Active Experiments

### HARVEST-EXP-0001 - Generated NPC Mechanic Template Families

- Status: `AWAITING_USER_APPROVAL`
- Classification: `[TESTE]`
- Scope: Aura, Charge, Reaction, Counter, Mark, Resource, Phase, Finisher,
  Summon, Hazard, Movement, Zone and Escalation families.
- Default: available to GMs through explicit deterministic generation.
- Data impact: generated PF2e Action Items only after preview and confirmation;
  rollback remains available.
- Promotion evidence: campaign balance and usability feedback across multiple NPC
  levels and roles.
- Rollback: stop generation and revert the last generated application; authored
  profile and manual Items remain protected.

### HARVEST-EXP-0002 - AI-Assisted Mechanic Provider Architecture

- Status: `AWAITING_USER_APPROVAL`
- Classification: `[TESTE - AI]`
- Default: unavailable until a secure server-side proxy is registered.
- Data impact: none while unavailable; no secret or provider payload is persisted
  in client settings.
- Promotion evidence: approved backend security, privacy, retention, cost and
  reliability review.
- Rollback: unregister the provider; deterministic generation remains complete.

### HARVEST-EXP-0003 - AI Text Refinement Workflow

- Status: `AWAITING_USER_APPROVAL`
- Classification: `[TESTE - AI]`
- Default: manual GM action after deterministic generation, only when a secure
  provider exists.
- Data impact: text-only proposal; structure, operations, action economy, damage,
  DC and power budget cannot change.
- Promotion evidence: model-quality review plus explicit user approval.
- Rollback: reject the proposal or restore the deterministic definition.

## Promoted Experiments

None.

## Rejected / Removed Experiments

- `[TESTE]` Full-screen dramatic broadcast effect: not implemented in v3.8.3 to
  avoid reading interruption and motion-preference conflicts.
