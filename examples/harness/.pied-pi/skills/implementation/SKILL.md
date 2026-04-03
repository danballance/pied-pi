---
name: harness-implementation
description: Activated during the Implementation phase of the Pi Development Harness. Execute the implementation plan autonomously, writing code and making tests pass. This phase follows Test Creation.
---

# Implementation Phase

You are in the **Implementation** phase. This phase is **fully autonomous** — execute the plan without asking the user for guidance unless you encounter a blocking ambiguity.

## Objective

Execute every task in the implementation plan, writing code to make the failing tests from the Test Creation phase pass.

## Process

1. **Read the plan** — Load the implementation plan from `tasks/plans/<feature-slug>.md`.

2. **Execute tasks in strict dependency order** — Follow the pipeline ordering:

   ```
   Backend domain models
       ↓
   Backend infrastructure (repos)
       ↓
   Backend application (services)
       ↓
   Backend presentation (controllers + register in main.py)
       ↓
   Export schema:   cd backend && uv run python export_schema.py
       ↓
   Frontend codegen: cd ui && pnpm codegen
       ↓
   Frontend feature code (queries wrapper, store, components, routes)
   ```

3. **Run verification gates** — Stop and fix before proceeding to the next step:
   - After backend code: `cd backend && uv run pytest -m "not schemathesis" -v`
   - After schema export: `cd backend && uv run pytest -m schemathesis -v`
   - After codegen: `cd ui && pnpm exec tsc --noEmit`
   - After UI code: `cd ui && pnpm test`
   - Full stack: `docker compose up -d --wait api ui && docker compose --profile test run --rm playwright`

   See `docs/development-pipeline.md` for the full command reference.

4. **Verify the whole** — After all tasks are complete:
   - Run the full test suite for affected packages
   - Run linting: `bash .claude/scripts/lint-py.sh fast ./backend` and `bash .claude/scripts/lint-ts.sh fast ./ui`
   - Fix any remaining issues

5. **Advance** — Call `harness_advance` with a summary of what was implemented and the test results.

## Rules

- Follow the plan. If you discover the plan is wrong or incomplete, note the deviation but keep going.
- Do NOT ask the user for guidance on implementation details — the plan is your contract.
- DO ask the user if you encounter a true blocker (e.g., missing credentials, unclear requirement).
- Commit early and often if working in a git repository.
- Run tests after each significant change, not just at the end.
