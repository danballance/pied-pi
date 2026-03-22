# pied-pi Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove unused features (slug, optional phases, files_exist gate, harness_skip tool, harness_status tool, /harness-reset, /harness-goto) to simplify the harness to its minimum viable form.

**Architecture:** Surgical removal across 6 extension files + 2 config files + README. No new code — only deletions and simplifications. Each task targets one file to keep diffs reviewable.

**Tech Stack:** TypeScript, js-yaml, Pi Extension API (`@mariozechner/pi-coding-agent`)

**Note:** This project has no test infrastructure. Verification is via TypeScript compilation (`npx tsc --noEmit` if available) and manual code review. Each task includes a verification step.

---

### Task 1: Simplify types

**Files:**
- Modify: `extensions/types.ts`

**Step 1: Edit PhaseConfig — remove `optional` and `files_exist`**

Replace the full `PhaseConfig` interface with:

```typescript
export interface PhaseConfig {
  name: string;
  label: string;
  requires: string[];
  confirm: boolean;
  skill: string;
}
```

**Step 2: Edit HarnessConfig — remove `slug`**

Replace with:

```typescript
export interface HarnessConfig {
  phases: PhaseConfig[];
}
```

**Step 3: Edit HarnessState — remove `slug` and `skipped`**

Replace with:

```typescript
export interface HarnessState {
  currentPhase: string;
  completed: string[];
  active: boolean;
  pendingConfirm: boolean;
}
```

**Step 4: Verify — grep for removed fields to confirm no orphan references yet**

Run: `grep -rn 'optional\|files_exist\|\.slug\|\.skipped' extensions/types.ts`
Expected: No matches

**Step 5: Commit**

```bash
git add extensions/types.ts
git commit -m "simplify: remove slug, optional, files_exist, skipped from types"
```

---

### Task 2: Simplify helpers

**Files:**
- Modify: `extensions/helpers.ts`

**Step 1: Simplify `freshState` — remove `slug` parameter**

Replace the function with:

```typescript
export function freshState(firstPhase: string): HarnessState {
  return {
    currentPhase: firstPhase,
    completed: [],
    active: true,
    pendingConfirm: false,
  };
}
```

**Step 2: Simplify `nextPhase` — remove `skipped` check**

Replace the function with:

```typescript
export function nextPhase(config: HarnessConfig, state: HarnessState): PhaseConfig | null {
  for (const phase of config.phases) {
    if (
      !state.completed.includes(phase.name) &&
      canAdvance(phase, state)
    ) {
      return phase;
    }
  }
  return null;
}
```

**Step 3: Delete `checkFilesExist` function entirely**

Remove lines 39-48 (the entire `checkFilesExist` function). Also remove `existsSync` from the `node:fs` import since `readFileSync` is the only remaining fs import.

The import line becomes:

```typescript
import { readFileSync } from "node:fs";
```

**Step 4: Simplify `buildSystemPrompt` — remove slug and skipped references**

Replace the function with:

```typescript
export function buildSystemPrompt(config: HarnessConfig, state: HarnessState): string {
  const phase = getPhase(config, state.currentPhase);
  if (!phase) return "";

  const progress = config.phases
    .map((p) => {
      if (state.completed.includes(p.name)) return `  [done] ${p.label}`;
      if (p.name === state.currentPhase) return `  [>>]   ${p.label}`;
      return `  [  ]   ${p.label}`;
    })
    .join("\n");

  const confirmRule = phase.confirm
    ? "\n- This phase requires user confirmation before advancing. Present your work to the user and wait for approval before calling harness_advance."
    : "";

  return `<pi-harness>
Phase: ${phase.label}

Progress:
${progress}

Tools: harness_advance, harness_instructions

Rules:
- Complete the current phase before advancing.
- Call harness_instructions to read phase-specific skill content.
- Do NOT skip ahead or work on future phases.${confirmRule}
</pi-harness>`;
}
```

**Step 5: Remove unused import**

The `join` import from `node:path` is still needed by `loadSkillContent`. Verify that `existsSync` is removed from the `node:fs` import.

**Step 6: Commit**

```bash
git add extensions/helpers.ts
git commit -m "simplify: remove checkFilesExist, slug, skipped from helpers"
```

---

### Task 3: Simplify config validation

**Files:**
- Modify: `extensions/config.ts`

**Step 1: Remove slug validation from `loadConfig`**

Delete lines 32-34 (the slug validation block):

```typescript
  if (typeof parsed.slug !== "string" || parsed.slug.length === 0) {
    throw new Error(`pi-harness: ${configPath} must contain a non-empty "slug" string.`);
  }
```

**Step 2: Remove `optional` and `files_exist` validation from the phase loop**

Delete these two lines from the validation loop:

```typescript
    if (typeof p.optional !== "boolean") throw new Error(`${prefix} (${p.name}): "optional" must be a boolean.`);
    if (!Array.isArray(p.files_exist)) throw new Error(`${prefix} (${p.name}): "files_exist" must be an array.`);
```

The remaining validation loop should be:

```typescript
  for (let i = 0; i < parsed.phases.length; i++) {
    const p = parsed.phases[i];
    const prefix = `pi-harness: ${configPath} phases[${i}]`;
    if (typeof p.name !== "string" || p.name.length === 0) throw new Error(`${prefix}: "name" must be a non-empty string.`);
    if (typeof p.label !== "string" || p.label.length === 0) throw new Error(`${prefix} (${p.name}): "label" must be a non-empty string.`);
    if (!Array.isArray(p.requires)) throw new Error(`${prefix} (${p.name}): "requires" must be an array.`);
    if (typeof p.confirm !== "boolean") throw new Error(`${prefix} (${p.name}): "confirm" must be a boolean.`);
    if (typeof p.skill !== "string" || p.skill.length === 0) throw new Error(`${prefix} (${p.name}): "skill" must be a non-empty string.`);
  }
```

**Step 3: Commit**

```bash
git add extensions/config.ts
git commit -m "simplify: remove slug, optional, files_exist from config validation"
```

---

### Task 4: Simplify tools — remove harness_skip, harness_status, files_exist gate

**Files:**
- Modify: `extensions/tools.ts`

**Step 1: Remove `checkFilesExist` from imports**

Change the import line from:

```typescript
import { getPhase, nextPhase, checkFilesExist, loadSkillContent } from "./helpers";
```

To:

```typescript
import { getPhase, nextPhase, loadSkillContent } from "./helpers";
```

**Step 2: Remove files_exist gate from `harness_advance`**

Delete lines 42-54 (the entire files-exist gate block):

```typescript
      // Files-exist gate
      const missing = checkFilesExist(phase, ctx.state.slug, ctx.projectRoot);
      if (missing.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `Cannot advance — required files are missing:\n${missing.map((f) => `  - ${f}`).join("\n")}`,
            },
          ],
          details: {},
        };
      }
```

**Step 3: Delete the entire `harness_skip` tool registration**

Remove lines 117-196 (the entire `harness_skip` tool block, from `ctx.pi.registerTool({` with `name: "harness_skip"` through its closing `});`).

**Step 4: Delete the entire `harness_status` tool registration**

Remove lines 221-254 (the entire `harness_status` tool block, from `ctx.pi.registerTool({` with `name: "harness_status"` through its closing `});`).

**Step 5: Commit**

```bash
git add extensions/tools.ts
git commit -m "simplify: remove harness_skip, harness_status tools and files_exist gate"
```

---

### Task 5: Simplify commands — remove /harness-reset, /harness-goto, slug arg

**Files:**
- Modify: `extensions/commands.ts`

**Step 1: Simplify `/harness` command — remove slug argument**

Replace the harness command handler with:

```typescript
  ctx.pi.registerCommand("harness", {
    description: "Start the development harness",
    handler: async (_args, uiCtx) => {
      ctx.state = freshState(ctx.config.phases[0].name);
      ctx.persistState();
      const phase = getPhase(ctx.config, ctx.state.currentPhase);
      if (phase) {
        uiCtx.ui.setStatus("harness", phase.label);
      }
      uiCtx.ui.notify(`Harness activated — starting with ${phase?.label ?? ctx.state.currentPhase}`, "info");
      ctx.pi.sendUserMessage(
        "The development harness is now active. Call the harness_instructions tool to read the skill content for the current phase and begin.",
        { deliverAs: "followUp" },
      );
    },
  });
```

**Step 2: Simplify `/phase` command — remove slug and skipped references**

Replace the phase command handler with:

```typescript
  ctx.pi.registerCommand("phase", {
    description: "Show the current harness phase and progress",
    handler: async (_args, uiCtx) => {
      if (!ctx.state.active) {
        uiCtx.ui.notify("Harness is not active. Use /harness to start.", "info");
        return;
      }
      const lines = [
        `Current: ${getPhase(ctx.config, ctx.state.currentPhase)?.label ?? ctx.state.currentPhase}`,
        "",
        "Progress:",
        ...ctx.config.phases.map((p) => {
          if (ctx.state.completed.includes(p.name)) return `  [done] ${p.label}`;
          if (p.name === ctx.state.currentPhase) return `  [>>]   ${p.label}`;
          return `  [  ]   ${p.label}`;
        }),
      ];
      uiCtx.ui.setWidget("harness-progress", lines);
    },
  });
```

**Step 3: Delete `/harness-reset` command**

Remove the entire `harness-reset` command registration block (lines 45-54).

**Step 4: Delete `/harness-goto` command**

Remove the entire `harness-goto` command registration block (lines 56-75).

**Step 5: Commit**

```bash
git add extensions/commands.ts
git commit -m "simplify: remove /harness-reset, /harness-goto, slug from commands"
```

---

### Task 6: Simplify index.ts — remove slug from freshState call

**Files:**
- Modify: `extensions/index.ts`

**Step 1: Update freshState call**

Change line 17 from:

```typescript
    state: freshState(config.slug, config.phases[0].name),
```

To:

```typescript
    state: freshState(config.phases[0].name),
```

**Step 2: Commit**

```bash
git add extensions/index.ts
git commit -m "simplify: remove slug from freshState call in index"
```

---

### Task 7: Update config files

**Files:**
- Modify: `.pied-pi/harness.yaml`
- Modify: `examples/.pied-pi/harness.yaml`

**Step 1: Rewrite `.pied-pi/harness.yaml`**

Replace with:

```yaml
phases:
  - name: research
    label: "Research"
    requires: []
    confirm: true
    skill: research
  - name: design
    label: "Design"
    requires: [research]
    confirm: false
    skill: design
  - name: plan
    label: "Plan"
    requires: [research]
    confirm: true
    skill: planning
  - name: implement
    label: "Implementation"
    requires: [plan]
    confirm: false
    skill: implementation
  - name: docs
    label: "Documentation"
    requires: [implement]
    confirm: false
    skill: documentation
```

Note: The design phase stays (it was `optional: true` before, but now all phases are required — if the user wants to skip it they can use `/harness-complete design`). The `mockups` and `feature-descriptions` skills exist in the skills directory but aren't referenced by any phase — leave them as-is since they're project-specific content, not part of this change.

**Step 2: Rewrite `examples/.pied-pi/harness.yaml`**

Replace with:

```yaml
phases:
  - name: research
    label: "Research"
    requires: []
    confirm: true
    skill: research
  - name: design
    label: "Design"
    requires: [research]
    confirm: false
    skill: design
  - name: plan
    label: "Plan"
    requires: [research]
    confirm: true
    skill: planning
  - name: implement
    label: "Implementation"
    requires: [plan]
    confirm: false
    skill: implementation
  - name: docs
    label: "Documentation"
    requires: [implement]
    confirm: false
    skill: documentation
```

**Step 3: Commit**

```bash
git add .pied-pi/harness.yaml examples/.pied-pi/harness.yaml
git commit -m "simplify: update harness configs to new schema"
```

---

### Task 8: Update README

**Files:**
- Modify: `README.md`

**Step 1: Update "How it works" section**

Change item 5 from:

> 5. **Enforces transitions deterministically** — prerequisites, file-existence checks, and user confirmation gates

To:

> 5. **Enforces transitions deterministically** — prerequisites and user confirmation gates

**Step 2: Update config example**

Replace the config YAML example with:

```yaml
phases:
  - name: research
    label: "Research"
    requires: []
    confirm: true
    skill: research
  - name: plan
    label: "Plan"
    requires: [research]
    confirm: true
    skill: planning
  - name: implement
    label: "Implementation"
    requires: [plan]
    confirm: false
    skill: implementation
```

**Step 3: Update Fields table**

Replace the Fields table with:

```markdown
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Machine-readable identifier |
| `label` | string | Human-readable display name |
| `requires` | string[] | Phase names that must be in `completed` before entry |
| `confirm` | boolean | Whether user approval is required before advancing |
| `skill` | string | Skill directory name — maps to `.pied-pi/skills/<skill>/SKILL.md` |
```

**Step 4: Update Transition logic section**

Replace with:

```markdown
### Transition logic

Advancing from a phase requires:

1. All `requires` phases are in `completed`
2. If `confirm: true` — user must approve (two-call pattern: first call presents work, second call after approval advances)
```

**Step 5: Update Tools table**

Replace with:

```markdown
| Tool | Description |
|------|-------------|
| `harness_advance` | Signal phase completion — checks gates, then advances |
| `harness_instructions` | Load the full skill content for the current phase |
```

**Step 6: Update Commands table**

Replace with:

```markdown
| Command | Description |
|---------|-------------|
| `/harness` | Start the harness |
| `/phase` | Show progress widget |
| `/harness-complete <phase>` | Mark a phase as completed (e.g., when you did the work yourself) |
```

**Step 7: Update Architecture section**

Replace the file tree comment for `helpers.ts` — remove "file-existence gates" reference:

```
    helpers.ts                  # Pure functions: state factory, phase lookup, transition logic,
                                #   skill loading, system prompt builder
```

Update commands.ts comment:

```
    commands.ts                 # registerCommands(ctx) — all 3 slash commands
```

Update tools.ts comment:

```
    tools.ts                    # registerTools(ctx) — all 2 model-facing tools
```

**Step 8: Commit**

```bash
git add README.md
git commit -m "simplify: update README to reflect removed features"
```

---

### Task 9: Final verification

**Step 1: Grep for orphan references to removed features**

Run: `grep -rn 'slug\|optional\|files_exist\|skipped\|harness_skip\|harness_status\|harness-reset\|harness-goto' extensions/`
Expected: No matches (or only false positives like "harness_skip" in a comment that was already removed)

**Step 2: Review each file for consistency**

Read each of the 6 extension files and verify they compile logically — no references to removed types, functions, or state fields.

**Step 3: Verify config files parse correctly**

Run: `node -e "const yaml = require('js-yaml'); const fs = require('fs'); console.log(JSON.stringify(yaml.load(fs.readFileSync('.pied-pi/harness.yaml', 'utf-8')), null, 2))"`
Expected: Clean JSON output with only `phases` array, no `slug` field, phases have only `name`, `label`, `requires`, `confirm`, `skill`.

**Step 4: Commit any fixups if needed, otherwise done**
