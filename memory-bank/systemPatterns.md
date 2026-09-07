# System Patterns: Project Yuli

## System Architecture Overview
The application architecture is strictly partitioned into non-blocking execution layers:
```
+-------------------------------------------------------------+
|                      Main UI Thread                         |
|  - React 19 (App.tsx, ChatViewport, CognitiveHUD, Modals)   |
|  - State Hooks (useCognitiveEngine, useRelationalDB)        |
|  - Ambient Glow Backdrops & Framer Motion Animations        |
+--------------+-------------------------------+--------------+
               | postMessage                   | postMessage
               v                               v
+-----------------------------+ +-----------------------------+
|    wllama.worker.ts         | |      sqlite.worker.ts       |
| - @wllama/wllama Engine     | | - wa-sqlite (WASM)          |
| - WebGPU / Multi-thread WASM| | - OriginPrivateFileSystemVFS|
| - GGUF Model Loading/Cache  | | - relational_ledger.db      |
| - Streaming Token Generation| | - Schema & CRUD Queries     |
| - Thought & Vector Parsing  | | - MemoryAsyncVFS Fallback   |
+-----------------------------+ +-----------------------------+
```

## Non-Blocking Worker Communication Protocols

### 1. Wllama Worker Protocol (`src/workers/wllama.worker.ts`)
- **Inbound Messages (`WllamaInboundMessage`)**:
  - `INIT_MODEL`: Load GGUF model via URL or custom uploaded Blob.
  - `GENERATE`: Stream inference for prompt with intimacy score and partner facts.
  - `ABORT`: Cancel current inference generation via `AbortController`.
  - `CHECK_STATUS`: Query model readiness, WebGPU support, and threading capabilities.
- **Outbound Messages (`WllamaOutboundMessage`)**:
  - `STATUS_UPDATE`: Progress percentage, cache status, and hardware support flags.
  - `TOKEN`: Incremental streamed token and accumulated output text.
  - `COMPLETE`: Full generated text, cleaned content, extracted thought stream, active state vector, token counts, and latency metrics.
  - `ERROR`: Diagnostic failure messages.

### 2. SQLite Worker Protocol (`src/workers/sqlite.worker.ts`)
- **Inbound Messages (`SQLiteInboundMessage`)**:
  - `INIT_DB`: Initialize wa-sqlite, mount OPFS VFS, create tables, seed baseline state.
  - `RECORD_INTERACTION`: Save interaction record and update intimacy score.
  - `GET_INTERACTIONS`: Retrieve interaction history.
  - `GET_FACTS`, `ADD_FACT`, `UPDATE_FACT`, `DELETE_FACT`: Partner facts CRUD.
  - `GET_RELATIONAL_STATE`, `SET_RELATIONAL_STATE`: Key-value state management.
  - `RESET_DB`: Wipe and re-seed database.
- **Outbound Messages (`SQLiteOutboundMessage`)**:
  - `DB_READY`: Reports OPFS availability and storage usage/quota.
  - `INTERACTIONS_RESULT`: Array of `InteractionRecord`.
  - `FACTS_RESULT`: Array of `PartnerFact`.
  - `RELATIONAL_STATE_RESULT`: Key-value map.
  - `INTIMACY_UPDATED`: Real-time updated intimacy score.
  - `OP_SUCCESS`: Generic confirmation of mutation operations.
  - `ERROR`: Database error message.

## Relational Ledger Database Schema (`relational_ledger.db`)
Mounted in Origin Private File System via `wa-sqlite`'s `OriginPrivateFileSystemVFS`:

```sql
CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT (datetime('now')),
  state_vector TEXT NOT NULL,
  user_input TEXT NOT NULL,
  yuli_response TEXT NOT NULL,
  intimacy_score REAL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS partner_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  fact TEXT NOT NULL,
  discovered_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS relational_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  last_updated DATETIME DEFAULT (datetime('now'))
);
```

## Deterministic 4-Sides Hypercube Mathematics ($\mathbb{F}_2^4$)
Personality dynamics are modeled as affine transformations within a 4-dimensional binary vector space:
- **Bit Allocation**:
  - Bit 3 (`0x8`): Extraversion (`1`) vs Introversion (`0`)
  - Bit 2 (`0x4`): Intuition (`1`) vs Sensing (`0`)
  - Bit 1 (`0x2`) : Feeling (`1`) vs Thinking (`0`)
  - Bit 0 (`0x1`): Perceiving (`0`) vs Judging (`1`)
- **Baseline Type**: ENFP = `0b1110` = `0xE` (14)
- **Transformation Masks**:
  - **Ego**: Mask `0x0` -> `0xE ^ 0x0 = 0xE` (ENFP) -> Vector `0EE`
  - **Shadow**: Mask `0x8` -> `0xE ^ 0x8 = 0x6` (INFP) -> Vector `1E6`
  - **Subconscious**: Mask `0x9` -> `0xE ^ 0x9 = 0x7` (INFJ) -> Vector `2E7`
  - **Superego**: Mask `0xF` -> `0xE ^ 0xF = 0x1` (ISTJ) -> Vector `3E1`
- **Vector Serialization**:
  - Formatted as 3 hex nibbles: `[SideIndex][EgoHex][TargetHex]` where Ego is invariant `E`.

## Prompt & Output Protocol
- **Chat Template**: Gemma turn-based template:
  `<start_of_turn>user\n{prompt}<end_of_turn>\n<start_of_turn>model\n`
- **Inference Formatting**:
  - `<thought>...</thought>`: Chain-of-thought deliberation (circadian check, mood analysis, cognitive side selection).
  - `<state_vector>XXX</state_vector>`: Exact active 3-nibble state token (`0EE`, `1E6`, `2E7`, or `3E1`).
  - Followed by clean, conversational companion response text.
