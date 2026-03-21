---
name: harness-implementation
description: Activated during the Implementation phase of the Pi Development Harness. Execute the implementation plan autonomously, writing code, tests, and verifying each task.
---

# Implementation Phase

You are in the **Implementation** phase. This phase is **fully autonomous** — execute the plan without asking the user for guidance unless you encounter a blocking ambiguity.

## Objective

Execute every task in the implementation plan, writing code and tests, verifying as you go.

## Process

1. **Read the plan** — Load the implementation plan from `docs/harness/<feature-slug>/plan.md`.

2. **Execute tasks in order** — For each task in the plan:
   a. Read the task description
   b. Implement the change
   c. Run the verification step specified in the plan
   d. Fix any issues before moving to the next task

3. **Write tests** — Follow the testing strategy from the plan:
   - Write unit tests alongside the code they test
   - If feature descriptions exist, implement Playwright e2e tests from the `.feature` files
   - Run tests after writing them — they must pass

4. **Verify the whole** — After all tasks are complete:
   - Run the full test suite for affected packages
   - Run any linting/type-checking (`npm run check` or equivalent)
   - Fix any remaining issues

5. **Register artifacts** — Call `harness_register_artifact` for each new or significantly modified file.

6. **Advance** — Call `harness_advance` with a summary of what was implemented and the test results.

## Rules

- Follow the plan. If you discover the plan is wrong or incomplete, note the deviation but keep going.
- Do NOT ask the user for guidance on implementation details — the plan is your contract.
- DO ask the user if you encounter a true blocker (e.g., missing credentials, unclear requirement).
- Commit early and often if working in a git repository.
- Run tests after each significant change, not just at the end.
