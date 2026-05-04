import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { HarnessState, HarnessStatus } from "./types";

const STATUS_KIND = "park-bench-agent-run-status";
const STATUS_FILE_NAME = "park-bench-status.json";

function getStatusPath(piedPiDir: string): string {
  return join(piedPiDir, STATUS_FILE_NAME);
}

function buildStatus(
  state: HarnessState,
  summary: string | null,
  failureReason: string | null,
): HarnessStatus {
  return {
    kind: STATUS_KIND,
    state: state.active ? "running" : failureReason === null ? "completed" : "failed",
    current_phase: state.active ? state.currentPhase : null,
    completed_phases: [...state.completed],
    summary,
    failure_reason: failureReason,
    updated_at: new Date().toISOString(),
  };
}

export function writeHarnessStatus(
  piedPiDir: string,
  state: HarnessState,
  summary: string | null = null,
  failureReason: string | null = null,
): void {
  const statusPath = getStatusPath(piedPiDir);
  const tempPath = `${statusPath}.tmp`;
  mkdirSync(dirname(statusPath), { recursive: true });
  writeFileSync(tempPath, `${JSON.stringify(buildStatus(state, summary, failureReason), null, 2)}\n`, "utf-8");
  renameSync(tempPath, statusPath);
}
