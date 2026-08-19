# v3.8.1 Visual Test Report

Date: 2026-08-19  
Environment: Foundry VTT localhost, authenticated ChatGPT Gamemaster session  
Viewport: 1523 x 1318; Field Communicator approximately 520 x 780

## Scope

- Contract Archive list and status groups.
- Contract 01 operational detail.
- Embedded PDF.js report viewer.
- Page, zoom, fit and keyboard controls.
- Local back-stack and return to communicator home.
- Permission and fallback behavior through automated tests.

## Results

1. The Contracts app listed one completed contract in the correct group and
   reported zero active contracts.
2. Contract 01 opened with status, location, region, difficulty, grade,
   supervisor and information progress without overlapping the footer.
3. The canonical report rendered a nonblank first page in canvas and identified
   all 13 pages.
4. Next-page navigation reached page 2; `Fit Page` kept the whole page inside the
   reader stage.
5. Zoom reached 110%; `ArrowRight` advanced to page 3 without affecting Foundry.
6. Bottom Back unwound viewer -> detail -> archive -> communicator home.
7. Power shutdown on page 2 returned to the locked launcher; reopening restored
   page 2 and rendered its canvas again.
8. No Foundry notification or module error appeared during the flow.

## Evidence

- [Contract Archive](01-contract-archive.png)
- [Contract Detail](02-contract-detail.png)
- [Embedded PDF - Page 1](03-embedded-pdf-page-1.png)
- [Restored PDF - Page 2](04-restored-page-2.png)

## Security Notes

- The bundled Contract 01 PDF is intentionally a public module asset and should
  contain no GM-only secrets.
- Restricted custom reports must use Foundry document UUIDs and native document
  permissions; attachments are projected independently from their contract.
- Arbitrary URLs and world paths are rejected by the document target policy.

## Bugs Discovered During Development

Area: Contract archive authority lifecycle  
Bug: A client initialized as a secondary GM would not create the archive after
becoming the primary GM during the same session.  
Severity: P2  
Requested originally: NO  
Fixed: YES  
Validation: Automated authority-handoff regression test.

## Constraints

- Compact behavior is covered by deterministic layout contracts and responsive
  CSS. The authenticated visual pass used the desktop viewport available in the
  active Foundry session.
- PDF fallback is covered by an automated PDF.js rejection test because the
  canonical report loaded successfully in the live Foundry pass.
