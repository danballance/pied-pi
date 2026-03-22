import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ── Config types ───────────────────────────────────────────────────────

export interface PhaseConfig {
  name: string;
  label: string;
  requires: string[];
  confirm: boolean;
  skill: string;
}

export interface HarnessConfig {
  phases: PhaseConfig[];
}

// ── State ──────────────────────────────────────────────────────────────

export interface HarnessState {
  currentPhase: string;
  completed: string[];
  active: boolean;
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
