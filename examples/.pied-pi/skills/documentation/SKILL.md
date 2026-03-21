---
name: harness-documentation
description: Activated during the Documentation phase. Write or update documentation to reflect the newly implemented feature.
---

# Documentation Phase

You are in the **Documentation** phase. The feature is implemented — now document it.

## Objective

Ensure the feature is properly documented for users and future developers.

## Process

1. **Review what was built** — Read the implementation plan and the code that was written.

2. **Update existing docs** — Check for:
   - README files that need updating
   - API documentation that needs new entries
   - Configuration documentation for new options
   - Changelog entries

3. **Write new docs if needed** — For significant features, create dedicated documentation:
   - User-facing usage guides
   - Developer-facing architecture notes
   - Migration guides if there are breaking changes

4. **Advance** — Call `harness_advance` to complete the harness workflow.

## Rules

- Do NOT modify source code (only documentation files).
- DO update changelogs if the project uses them.
- DO check that code examples in documentation actually work.
