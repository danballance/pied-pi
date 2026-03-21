import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ── Config types ───────────────────────────────────────────────────────

export interface PhaseConfig {
  name: string;
  label: string;
  optional: boolean;
  requires: string[];
  confirm: boolean;
  files_exist: string[];
  skill: string;
}

export interface HarnessConfig {
  slug: string;
  phases: PhaseConfig[];
}

// ── State ──────────────────────────────────────────────────────────────

export interface HarnessState {
  currentPhase: string;
  completed: string[];
  skipped: string[];
  active: boolean;
  slug: string;
  pendingConfirm: boolean;
}

// ── Shared context ─────────────────────────────────────────────────────

export interface HarnessContext {
  pi: ExtensionAPI;
  config: HarnessConfig;
  state: HarnessState;
  piedPiDir: string;
  projectRoot: string;
  persistState: () => void;
}
