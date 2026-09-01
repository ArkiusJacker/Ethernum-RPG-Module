# Consolidation and Reliability Roadmap - v3.8.7 to v3.8.10

This phase consolidates existing functionality. It does not introduce new
playable profiles, campaign mechanics, AI providers or an Encounter Generator.

| Version | Focus | Release gate |
| --- | --- | --- |
| 3.8.7 | Repository integrity and PF2e parity | Main/tag topology, parity diagnostics, sheet sweep, compatibility and HARVEST truth |
| 3.8.8 | Operational reliability and campaign storage | Real multiplayer mutation QA, recovery UX, portable Data Folder documents and package-size reporting |
| 3.8.9 | Field Communicator truth | Real status, notification state, squad membership, settings and lifecycle QA |
| 3.8.10 | Architecture and performance | GM controller decomposition, API documentation, Application modernization, lifecycle audits and performance baseline |

Every version must pass a clean install, typecheck, automated tests, build,
manifest/distribution validation, Foundry QA, commit on `main`, tag, independent
GitHub release and post-release asset/topology verification.

The canonical and interface-reliability hotfix occupies v3.8.11. Encounter Suite
2.0 moves to v3.8.12 so its mechanical scope remains separate from the migration,
localization and reliability corrections.

All four consolidation releases were implemented and independently validated. The v3.8.10 architecture decisions and performance evidence are recorded under `docs/qa/v3.8.10/`.
