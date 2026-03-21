# Pi Development Harness

A config-driven state machine for the [Pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent). Enforces phased development workflows by controlling what the model can do at each step.

## How it works

The harness is a Pi **extension** that:

1. **Discovers project config** from a `.pied-pi/` directory (walks CWD upward, like `.git` discovery)
2. **Loads phases from `.pied-pi/harness.yaml`** — names, ordering, prerequisites, gates
3. **Injects a compact status block** into the system prompt every turn (phase name, progress, rules — no skill content)
4. **Provides tools** for the model to read phase instructions on demand and signal transitions
5. **Enforces transitions deterministically** — prerequisites, file-existence checks, and user confirmation gates

## Project Setup

Create a `.pied-pi/` directory in your project root:

```
your-project/
  .pied-pi/
    harness.yaml              # Phase definitions
    skills/
      <phase-name>/SKILL.md   # Phase instructions (loaded on demand)
```

The extension is pure logic — it contains no config or skills. Each project owns its own workflow definition.

See `examples/.pied-pi/` for a complete example harness with skill files you can copy into your project.

## Config

Phases are defined in `.pied-pi/harness.yaml`. Every field is required on every phase — no defaults, no inference.

```yaml
slug: my-feature
phases:
  - name: research
    label: "Research"
    optional: false
    requires: []
    confirm: true
    files_exist:
      - "docs/{slug}/research.md"
    skill: research
  - name: plan
    label: "Plan"
    optional: false
    requires: [research]
    confirm: true
    files_exist:
      - "docs/{slug}/plan.md"
    skill: planning
  - name: implement
    label: "Implementation"
    optional: false
    requires: [plan]
    confirm: false
    files_exist: []
    skill: implementation
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Machine-readable identifier |
| `label` | string | Human-readable display name |
| `optional` | boolean | Whether the model can skip this phase |
| `requires` | string[] | Phase names that must be in `completed` before entry |
| `confirm` | boolean | Whether user approval is required before advancing |
| `files_exist` | string[] | Paths (with `{slug}` substitution) that must exist before advancing |
| `skill` | string | Skill directory name — maps to `.pied-pi/skills/<skill>/SKILL.md` |

### Transition logic

Advancing from a phase requires:

1. All `requires` phases are in `completed` (skipped does NOT count)
2. All `files_exist` paths exist on disk (resolved relative to the project root)
3. If `confirm: true` — user must approve (two-call pattern: first call presents work, second call after approval advances)

### Discovery

The extension finds `.pied-pi/harness.yaml` by walking from the current working directory upward to the filesystem root. This means you can launch Pi from any subdirectory and it will find the config in your project root.

If no `.pied-pi/harness.yaml` is found, the extension throws a clear error with the search path.

## Tools

| Tool | Description |
|------|-------------|
| `harness_advance` | Signal phase completion — checks gates, then advances |
| `harness_skip` | Skip an optional phase |
| `harness_instructions` | Load the full skill content for the current phase |
| `harness_status` | Show current phase, slug, and progress |

## Commands

| Command | Description |
|---------|-------------|
| `/harness [slug]` | Start the harness (optional slug override) |
| `/phase` | Show progress widget |
| `/harness-reset` | Clear all state |
| `/harness-goto <phase>` | Jump to a specific phase |
| `/harness-complete <phase>` | Mark a phase as completed (e.g., when you did the work yourself) |

## Architecture

```
pied-pi/                        # Extension package (pure logic)
  package.json                  # Pi package manifest + js-yaml dependency
  extensions/
    index.ts                    # Thin entry point — creates context, wires events, delegates
    types.ts                    # Interfaces: PhaseConfig, HarnessConfig, HarnessState, HarnessContext
    config.ts                   # Project discovery (walks CWD upward) and YAML config loading
    helpers.ts                  # Pure functions: state factory, phase lookup, transition logic,
                                #   file-existence gates, skill loading, system prompt builder
    commands.ts                 # registerCommands(ctx) — all 5 slash commands
    tools.ts                    # registerTools(ctx) — all 4 model-facing tools
  .pied-pi/                     # Project config (lives alongside the extension or in any project)
    harness.yaml                # Phase definitions
    skills/
      <phase-name>/SKILL.md     # Phase instructions (loaded on demand)
```

### Shared context

Modules communicate through a single `HarnessContext` object created in `index.ts` and passed to `registerCommands` and `registerTools`. It bundles the Pi API handle, loaded config, mutable state, resolved paths, and a `persistState` helper. Because every module holds a reference to the same object, state mutations (including full reassignment via `ctx.state = freshState(...)`) are immediately visible everywhere.

### System prompt

The system prompt injection is deliberately minimal — just the current phase, progress, and rules. Full phase instructions are loaded on demand via the `harness_instructions` tool, keeping the system prompt compact.

## Installation

```bash
# Project-local
pi install /path/to/pied-pi -l

# Development (symlink)
pi --extension /path/to/pied-pi/extensions/index.ts
```

Then create `.pied-pi/harness.yaml` and `.pied-pi/skills/` in your project root.
