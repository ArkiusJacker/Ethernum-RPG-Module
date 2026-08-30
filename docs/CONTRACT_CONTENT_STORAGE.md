# Contract Campaign Content Storage

This document describes the v3.8.8 contract-document boundary. It separates
campaign-owned content from bundled compatibility assets without coupling the
contract domain to a Foundry `FilePicker` UI.

## Canonical reference

`ContractStoredDocument` has exactly one locator appropriate to its storage:

| `storage` | Required locator | Meaning |
| --- | --- | --- |
| `foundry-document` | `uuid` | A Foundry document resolved through `fromUuid` and its ownership rules |
| `foundry-data` | `path` | A portable path relative to the Foundry Data Folder |
| `module-asset` | `path` | A public bundled asset below `modules/ethernum-rpg-module/assets/` |

Absolute paths, Windows drive paths, UNC paths, URL schemes, backslashes,
traversal segments, query strings and fragments are rejected during
normalization. Invalid document locators are omitted instead of being written
to the administrative archive.

Legacy `pdfPath`, `journalUuid` and attachment `path`/`uuid` fields remain
readable. Normalization derives the canonical reference from them when no
canonical reference exists. Contract 01 keeps its bundled PDF path and now also
declares the equivalent `module-asset` reference.

## Safe migration flow

`ContractDocumentStorageService` receives a `ContractFilePickerPort`; it never
navigates the host filesystem. The future GM FilePicker UI supplies a selected
Data Folder path through that port.

The migration order is:

1. Validate the current source as a bundled `module-asset`.
2. Validate the selected destination as a portable `foundry-data` path.
3. Ask the adapter to copy with `overwrite: false`.
4. Normalize the path returned by the adapter.
5. Verify that the copied file exists.
6. Recheck archive revision and source identity under the mutation lock.
7. Persist the new canonical `foundry-data` reference.

A failed copy, failed verification or concurrent archive change never replaces
the active reference. Legacy bundled fields remain present as compatibility and
recovery metadata; the module asset is not deleted.

## Missing documents

File probes and Foundry UUID resolution produce structured availability data.
A missing document uses the stable code `DOCUMENT UNAVAILABLE`. Contract lists
and snapshots continue to render, while the embedded viewer switches to its
fallback instead of propagating the load error.

Without a configured adapter, path availability is `unchecked`; this avoids a
false claim that a file exists. The adapter and GM migration UI are intentionally
outside this domain-only change.
