# v3.8.2 Visual Test Report

Date: 2026-08-19

Environment: local Foundry VTT v14 world, PF2e, authenticated ChatGPT
Gamemaster with Arkius Jacker assigned as the exact player character.

## Scope

- Real PF2e balance from `Actor.inventory.coins`.
- Catalog and detail rendering with a live world Item.
- Automatic purchase, stock commit and Item grant.
- Approval request, GM queue decision and final Item grant.
- Primary-GM initialization and Foundry Journal persistence.
- Cleanup of every temporary QA document after the run.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Assigned-character gate and real `0 cp` balance | Pass | `02-store-catalog-fixed.png` |
| Two catalog modes and metadata layout | Pass after fix | `01-store-catalog.png`, `02-store-catalog-fixed.png` |
| Detail, live Item description and explicit confirmation | Pass | `03-store-detail.png` |
| Automatic transaction and Item delivery | Pass | `04-store-automatic-receipt.png` |
| Stock `1 -> 0` and sold-out state | Pass | DOM assertion during the run |
| Approval request without debit | Pass | `05-store-approval-request.png` |
| GM queue with Approve/Reject and no trust shortcut | Pass | `06-gm-approval-queue.png` |
| Approval completion and Item delivery | Pass | `07-store-approved-receipt.png` |
| Temporary world state removed | Pass | zero QA catalog rows and zero QA labels after cleanup |

## Defects Found And Fixed

1. Foundry's generic button height overrode the catalog row minimum, causing the
   second offer to cover the first offer's metadata. The row now has
   `height: auto` plus its stable minimum height.
2. `JournalEntry.create` was detached from its document class. Foundry v14 then
   failed while reading `createDocuments` during primary-GM initialization. Store
   and Contract Journal creation now call the configured document class with its
   original `this` context.
3. The price parser required a non-zero denomination and rejected valid free
   offers. A matched-denomination check now accepts `0 cp` without accepting
   malformed text.

## World Hygiene

The QA catalog entries, completed QA transactions, granted Actor Items, source
world Item, attestation ChatMessages and temporary macro were removed. The
versioned administrative Store Journal remains as the legitimate empty storage
for future offers.
