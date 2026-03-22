# Pi Development Harness

A config-driven state machine for the [Pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent). Enforces phased development workflows by controlling what the model can do at each step.

## How it works

The harness is a Pi **extension** that:

1. **Discovers project config** from a `.pied-pi/` directory (walks CWD upward, like `.git` discovery)
2. **Loads phases from `.pied-pi/harness.yaml`** — names, ordering, prerequisites, gates
3. **Injects a compact status block** into the system prompt every turn (phase name, progress, rules — no skill content)
4. **Provides tools** for the model to read phase instructions on demand and signal transitions
5. **Enforces transitions deterministically** — prerequisites and user confirmation gates

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

Phases are defined in `.pied-pi/harness.yaml`.

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

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Machine-readable identifier |
| `label` | string | Human-readable display name |
| `requires` | string[] | Phase names that must be in `completed` before entry |
| `confirm` | boolean | Whether user approval is required before advancing |
| `skill` | string | Skill directory name — maps to `.pied-pi/skills/<skill>/SKILL.md` |

### Transition logic

Advancing from a phase requires:

1. All `requires` phases are in `completed`
2. If `confirm: true` — user must approve (two-call pattern: first call presents work, second call after approval advances)

### Discovery

The extension finds `.pied-pi/harness.yaml` by walking from the current working directory upward to the filesystem root. This means you can launch Pi from any subdirectory and it will find the config in your project root.

If no `.pied-pi/harness.yaml` is found, the extension throws a clear error with the search path.

## Tools

| Tool | Description |
|------|-------------|
| `harness_advance` | Signal phase completion — checks gates, then advances |
| `harness_instructions` | Load the full skill content for the current phase |

## Commands

| Command | Description |
|---------|-------------|
| `/harness` | Start the harness |
| `/phase` | Show progress widget |
| `/harness-complete <phase>` | Mark a phase as completed (e.g., when you did the work yourself) |

## Architecture

```
pied-pi/                        # Extension package (pure logic)
  package.json                  # Pi package manifest + js-yaml dependency
  extensions/
    index.ts                    # Thin entry point — creates context, wires events, delegates
    types.ts                    # Interfaces: PhaseConfig, HarnessConfig, HarnessState, HarnessContext
    config.ts                   # Project discovery (walks CWD upward) and YAML config loading
    helpers.ts                  # Pure functions: state factory, phase lookup, transition logic, skill loading, system prompt builder
    commands.ts                 # registerCommands(ctx) — all 3 slash commands
    tools.ts                    # registerTools(ctx) — all 2 model-facing tools
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
