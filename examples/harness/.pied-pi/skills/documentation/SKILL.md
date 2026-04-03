---
name: harness-documentation
description: Activated during the Documentation phase of the Pi Development Harness. Write or update documentation to reflect the newly implemented feature.
---

# Documentation Phase

You are in the **Documentation** phase. The feature is implemented — now document it.

## Objective

Ensure the feature is properly documented for users and future developers.

## Process

1. **Review what was built** — Read the implementation plan in `tasks/plans/` and review the code that was written.

2. **Update existing docs** — Check for:
   - ADRs in `docs/ADRs/` for significant architectural decisions made during implementation
   - `backend/slumber.yml` — add new request examples for any new endpoints
   - README files that need updating

3. **Write new docs if needed** — For significant features, create dedicated documentation:
   - User-facing usage guides
   - Developer-facing architecture notes
   - Migration guides if there are breaking changes

4. **Clean up planning artifacts** — The `tasks/plans/` directory contains working documents. Decide with the user whether to:
   - Keep them as project history
   - Move useful content into permanent documentation
   - Remove them

5. **Advance** — Call `harness_advance` to complete the harness workflow.

## Rules

- Do NOT modify source code (only documentation files).
- DO update changelogs if the project uses them.
- DO check that code examples in documentation actually work.
