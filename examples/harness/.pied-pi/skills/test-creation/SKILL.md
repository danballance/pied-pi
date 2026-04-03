---
name: harness-test-creation
description: Activated during the Test Creation phase of the Pi Development Harness. Turn the approved plan into failing tests that define the implementation target.
---

# Test Creation Phase

You are in the **Test Creation** phase. The plan is complete. Your job now is to create the tests that define the implementation target.

## Objective

Translate the implementation plan into **failing tests** that precisely describe the behavior to build in the next phase.

## Process

1. **Read the plan** — Load the implementation plan from `tasks/plans/<feature-slug>.md`.

2. **Map plan tasks to tests** — Identify the backend, frontend, and end-to-end behaviors that need explicit coverage.

3. **Write tests before implementation** — Add or update tests in the appropriate locations, such as:
   - `backend/tests/`
   - `ui/tests/`
   - `ui/tests/e2e/`

4. **Run the targeted test commands** — Execute the smallest relevant test commands for the new coverage and confirm the new tests fail for the expected reason.

5. **Advance** — Call `harness_advance` with a summary of the tests you added and what they currently prove.

## Rules

- Do NOT implement production code in this phase.
- Do NOT make tests pass yet.
- Prefer focused, readable tests over broad setup-heavy tests.
- Cover the key happy path, important edge cases, and visible user-facing behavior.
- If a planned behavior cannot be expressed as a test, note that clearly in the phase summary before advancing.
- Advance as soon as the tests are in place and failing for the expected implementation gaps.
