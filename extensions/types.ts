import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ── Config types ───────────────────────────────────────────────────────

export interface PhaseConfig {
  name: string;
  label: string;
  requires: string[];
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
}

export interface HarnessStatus {
  kind: "park-bench-harness-status";
  status: "running" | "completed";
  current_phase: string | null;
  completed_phases: string[];
  summary: string | null;
  updated_at: string;
}

// ── Shared context ─────────────────────────────────────────────────────

export interface HarnessContext {
  pi: ExtensionAPI;
  config: HarnessConfig;
  state: HarnessState;
  piedPiDir: string;
  projectRoot: string;
  persistState: () => void;
  writeStatus: (summary?: string | null) => void;
}
