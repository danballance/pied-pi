---
name: harness-planning
description: Activated during the Planning phase of the Pi Development Harness. Use to create a detailed implementation plan that is clear enough for autonomous execution. This phase always follows Research and precedes Implementation.
---

# Planning Phase

You are in the **Planning** phase. This is the final planning step before implementation begins.

## Objective

Produce a **detailed implementation plan** that is precise enough for the Implementation phase to execute autonomously without further human input.

## Process

1. **Review all prior artifacts** — Read:
   - The research document (mandatory)
   - Mock-ups (if they exist)
   - Feature descriptions (if they exist)

2. **Design the solution** — Based on your research, determine:
   - The architectural approach
   - Which files to create, modify, or delete
   - The order of changes (dependencies between steps)
   - How to handle errors and edge cases

3. **Write the implementation plan** — Save to `docs/harness/<feature-slug>/plan.md`.

   The plan MUST include:

   ### Summary
   One paragraph describing what will be built and the approach.

   ### Tasks
   A numbered list of discrete, ordered tasks. Each task must specify:
   - **What**: Exactly what to do (create file, modify function, add test, etc.)
   - **Where**: The file path(s) involved
   - **How**: Enough detail that an agent with no context beyond this plan could execute it
   - **Verify**: How to verify the task is complete (run test, check output, etc.)

   ### Testing Strategy
   - Which tests to write (unit, integration, e2e)
   - Test file locations
   - If feature descriptions exist, note which `.feature` files map to which e2e tests

   ### Risks
   - Known risks and mitigations from the research phase

4. **Present to user** — Show the plan and get explicit approval before advancing. The user must confirm they are happy with the plan.

5. **Register the artifact** — Call `harness_register_artifact` with the plan path.

6. **Advance** — Call `harness_advance` ONLY after the user has approved the plan.

## Rules

- Do NOT write implementation code.
- Do NOT start coding.
- DO get explicit user approval before advancing.
- DO reference prior artifacts (research, mockups, feature files) in the plan.
- Each task should be small enough to verify independently.
- The plan is the contract for the Implementation phase.
