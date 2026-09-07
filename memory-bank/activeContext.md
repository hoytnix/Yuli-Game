# Active Context: Project Yuli

## Current Focus
- Initializing and verifying the 6 core Memory Bank files to establish an authoritative source of truth.
- Verifying code conformance against architectural invariants (Zero-Cloud, Non-Blocking Workers, Bitwise Hypercube, Cross-Origin Isolation, OPFS Ledger, Storage Persistence Guarantee).

## Current Work Stream
- Initialized core Memory Bank documentation:
  - `projectbrief.md`: Foundational vision, PWA scope, and zero-cloud edge constraints.
  - `productContext.md`: Relational psychology, circadian rhythms, 4-Sides UX, and reasoning-first design.
  - `systemPatterns.md`: Web Worker IPC protocols, wa-sqlite OPFS schema, bitwise hypercube XOR math.
  - `techContext.md`: Stack definitions, COOP/COEP headers, and build tooling.
  - `activeContext.md`: Current active focus and system status.
  - `progress.md`: Build validation, feature verification, and roadmap.

## Recent State Changes
- Generated project `.gitignore` covering `node_modules/`, `dist/`, `.vite/`, GGUF model binaries (`*.gguf`, `*.bin`), SQLite files, and alternate lockfiles.
- Created complete `/memory-bank/` hierarchy.
- Rehydrated architectural invariants from codebase inspection (`src/`, `vite.config.ts`, `package.json`, `GEMINI.md`).

## Next Immediate Steps
1. Verify storage persistence call (`navigator.storage.persist()`) directly in `src/main.tsx` as mandated by Invariant 7.
2. Run typecheck (`pnpm exec tsc --noEmit`) to verify zero TypeScript errors.
3. Commit all changes to git according to conventional commit guidelines.

