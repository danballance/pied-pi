import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { PhaseConfig, HarnessConfig, HarnessState } from "./types";

export const CUSTOM_ENTRY_TYPE = "pi-harness-state";

export function freshState(slug: string, firstPhase: string): HarnessState {
  return {
    currentPhase: firstPhase,
    completed: [],
    skipped: [],
    active: true,
    slug,
    pendingConfirm: false,
  };
}

export function getPhase(config: HarnessConfig, name: string): PhaseConfig | undefined {
  return config.phases.find((p) => p.name === name);
}

export function canAdvance(phase: PhaseConfig, state: HarnessState): boolean {
  return phase.requires.every((req) => state.completed.includes(req));
}

export function nextPhase(config: HarnessConfig, state: HarnessState): PhaseConfig | null {
  for (const phase of config.phases) {
    if (
      !state.completed.includes(phase.name) &&
      !state.skipped.includes(phase.name) &&
      canAdvance(phase, state)
    ) {
      return phase;
    }
  }
  return null;
}

export function checkFilesExist(phase: PhaseConfig, slug: string, projectRoot: string): string[] {
  const missing: string[] = [];
  for (const pattern of phase.files_exist) {
    const resolved = join(projectRoot, pattern.replace(/\{slug\}/g, slug));
    if (!existsSync(resolved)) {
      missing.push(resolved);
    }
  }
  return missing;
}

export function loadSkillContent(piedPiDir: string, skill: string): string {
  const skillPath = join(piedPiDir, "skills", skill, "SKILL.md");
  try {
    return readFileSync(skillPath, "utf-8");
  } catch {
    return `[No skill file at ${skillPath}]`;
  }
}

export function buildSystemPrompt(config: HarnessConfig, state: HarnessState): string {
  const phase = getPhase(config, state.currentPhase);
  if (!phase) return "";

  const progress = config.phases
    .map((p) => {
      if (state.completed.includes(p.name)) return `  [done] ${p.label}`;
      if (state.skipped.includes(p.name)) return `  [skip] ${p.label}`;
      if (p.name === state.currentPhase) return `  [>>]   ${p.label}`;
      return `  [  ]   ${p.label}`;
    })
    .join("\n");

  const confirmRule = phase.confirm
    ? "\n- This phase requires user confirmation before advancing. Present your work to the user and wait for approval before calling harness_advance."
    : "";

  return `<pi-harness>
Phase: ${phase.label} | Slug: ${state.slug}

Progress:
${progress}

Tools: harness_advance, harness_skip, harness_instructions, harness_status

Rules:
- Complete the current phase before advancing.
- Call harness_instructions to read phase-specific skill content.
- Do NOT skip ahead or work on future phases.${confirmRule}
</pi-harness>`;
}
