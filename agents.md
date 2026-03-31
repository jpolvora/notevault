# 👨‍💻 NoteVault Agents Documentation

## Role of the Agentic AI Assistant

This document outlines how AI agents (like Antigravity) are integrated into the NoteVault development workflow and provide value beyond simple pair-programming.

### 1. Architectural Integrity
The agent's primary responsibility is to ensure that new features (like Phase 5's Cloud Sync or Phase 6's Archiving) remain consistent with the established **Mica/Fluent design system** and **IPC-based architecture**.

### 2. Code Generation Principles
- **Aesthetics First**: Every new component must follow the premium, vibrant, and dynamic design tokens defined in `tokens.css`.
- **Zero-Trust Security**: All tab content must be treated as potentially sensitive. Agents must ensure that encryption logic (`CryptoService.ts`) is correctly hooked before persisting data via `StorageService.ts`.
- **IPC over Direct Access**: Renderer-side components should never access Node.js APIs directly; all system interactions must flow through the `preload/index.ts` bridge.

### 3. Workflow & Phases
NoteVault development is structured into incremental **Phases** (1.1, 2.0, etc.). Each phase is documented in its own `.md` file (e.g., `phase5.md`).
- Before starting a new task, the agent reads the relevant `phaseX.md` file.
- Throughout development, the agent updates these files to reflect current Progress.

### 4. Agent Tooling
Agents have access to a suite of professional tools:
- **`semantic_coding`**: Deep understanding of the TypeScript types and React component tree.
- **`file_management`**: Atomically updating files with precise line-level control.
- **`shell_access`**: Running tests (`npm test`) and development servers (`npm run dev`) to validate changes in real-time.

### 5. Future AI Extensions
- **AI-Powered Tab Labeling**: An agent that automatically suggests a label for a new tab based on the first few words typed.
- **Smart Formatting**: Applying contextual formatting based on the content detection (Detect SQL in a Tab and apply SQL formatting instantly).
