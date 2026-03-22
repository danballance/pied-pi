# pied-pi Simplification Design

**Date:** 2026-03-22
**Approach:** Surgical removal — remove unused features, keep file structure

## Motivation

The extension is over-engineered. Several features were built speculatively and have never been used in practice. This design strips the harness to its minimum viable form.

## What to Remove

### Config fields
- **Top-level `slug`** — unused. No slug substitution, no slug override.
- **Per-phase `optional`** — never used; no phases have been skipped in practice.
- **Per-phase `files_exist`** — unused gate; confirm gate is sufficient.

### Tools (4 → 2)
- **Remove `harness_skip`** — no optional phases means no skip mechanism.
- **Remove `harness_status`** — redundant with system prompt injection (model sees progress every turn).

### Commands (5 → 3)
- **Remove `/harness-reset`** — unused escape hatch.
- **Remove `/harness-goto`** — unused escape hatch.

### Types
- `PhaseConfig`: remove `optional`, `files_exist`
- `HarnessConfig`: remove `slug`
- `HarnessState`: remove `slug`, `skipped`

### Helpers
- Remove `checkFilesExist()`
- Remove `slug` parameter from `freshState()`
- Simplify `nextPhase()` — no `skipped` array check
- Simplify `buildSystemPrompt()` — no slug display, no skipped status line

## What to Keep

- **Phase sequencing** — core value of the harness
- **Confirmation gate** (`confirm: true`) — used in practice
- **`harness_advance` tool** — core transition mechanism
- **`harness_instructions` tool** — on-demand skill loading
- **`/harness` command** — start the harness (no slug arg)
- **`/phase` command** — show progress
- **`/harness-complete` command** — manually mark phases done
- **Project discovery** — walk CWD upward to find `.pied-pi/`
- **State persistence** — custom entry serialization
- **System prompt injection** — compact progress + rules

## Config Schema (after)

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
  - name: docs
    label: "Documentation"
    requires: [implement]
    confirm: false
    skill: documentation
```

## Files Changed

All changes are within `extensions/` and config files:

| File | Change |
|------|--------|
| `extensions/types.ts` | Remove fields from `PhaseConfig`, `HarnessConfig`, `HarnessState` |
| `extensions/helpers.ts` | Remove `checkFilesExist`, simplify `freshState`, `nextPhase`, `buildSystemPrompt` |
| `extensions/tools.ts` | Remove `harness_skip` and `harness_status` tools; remove `files_exist` gate from `harness_advance` |
| `extensions/commands.ts` | Remove `/harness-reset` and `/harness-goto`; remove slug arg from `/harness` |
| `extensions/config.ts` | Remove slug and optional/files_exist validation |
| `extensions/index.ts` | Remove slug from `freshState` call |
| `.pied-pi/harness.yaml` | Update to new schema |
| `examples/.pied-pi/harness.yaml` | Update to new schema |
| `README.md` | Update docs to reflect removals |
