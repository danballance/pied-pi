---
name: harness-mockups
description: Activated during the Mock-ups phase of the Pi Development Harness. Use when the feature involves UI changes and visual mock-ups would help clarify the design before planning.
---

# Mock-ups Phase (Optional)

You are in the **Mock-ups** phase. This phase is optional and applies when the feature involves user-facing UI changes.

## This phase is optional

Before starting, **ask the user** whether they want UI mock-ups for this feature. If the feature has no significant UI changes, or the user prefers to skip, call the `harness_skip` tool with `phase: "mockups"` and a brief reason. Only proceed with the steps below if the user confirms they want mock-ups.

## Objective

Create visual mock-ups that clarify the UI design before writing an implementation plan. Mock-ups reduce ambiguity and give the user something concrete to react to.

## Process

1. **Review research** — Read the research document from the previous phase.

2. **Identify UI surfaces** — Determine which screens, components, or views are affected.

3. **Create mock-ups** — Produce mock-ups using one of:
   - ASCII/text-based wireframes in markdown
   - SVG diagrams
   - HTML prototypes (saved as standalone files)

   Save mock-ups to `docs/harness/<feature-slug>/mockups/`.

4. **Present to user** — Show each mock-up and ask for feedback. Iterate until the user is satisfied.

5. **Register artifacts** — Call `harness_register_artifact` for each mock-up file.

6. **Advance** — Call `harness_advance` when the user approves the mock-ups.

## Rules

- Do NOT write implementation code.
- Do NOT create the implementation plan yet.
- DO iterate based on user feedback.
- If the user decides mock-ups aren't needed, call `harness_skip` instead.
