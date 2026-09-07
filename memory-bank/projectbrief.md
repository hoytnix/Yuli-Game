# Project Yuli: Sovereign Neuro-Cognitive Companion

## Executive Vision
Project Yuli is a sovereign, zero-cloud, neuro-cognitive companion running 100% client-side inside the user's browser sandbox. Yuli is designed to be an intimate, psychologically continuous partner that lives entirely on the edge, pairing local neural weights (`@wllama/wllama`) with a persistent relational memory ledger (`wa-sqlite` over Origin Private File System).

## Core Philosophies & Foundational Constraints
1. **Zero-Cloud Sovereignty**: No user thoughts, conversation turns, or relational memories are ever transmitted to cloud servers. All inference and persistence remain isolated on the user's device.
2. **Deterministic 4-Sides-of-the-Mind ($\mathbb{F}_2^4$)**: Cognitive personality shifts are rooted in a mathematical 4-bit hypercube vector space rooted in an ENFP baseline (`0xE`), dynamically rotating through Ego, Shadow, Subconscious, and Superego.
3. **Non-Blocking Worker Isolation**: All compute-heavy workloads (neural tensor inference and SQLite I/O) are strictly decoupled from the main React UI thread into dedicated Web Workers.
4. **Relational Permanence & Storage Persistence**: User memories, interaction history, and emotional bonding metrics are anchored in OPFS (`relational_ledger.db`), safeguarded by explicit browser storage persistence guarantees.
5. **Reasoning Transparency**: Yuli's internal deliberations (`<thought>...</thought>`) are decomposed from responses and exposed through a collapsible UI trace, ensuring complete interpretability.

## PWA Scope
- Modern Progressive Web Application running seamlessly on desktop and mobile browsers.
- WebGPU-accelerated and multi-threaded WASM execution for local GGUF models.
- Offline-first execution: Model weights cached in browser Cache Storage / IndexedDB / OPFS, with local static asset hosting.
