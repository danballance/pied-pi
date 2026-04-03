---
name: harness-planning
description: Activated during the Planning phase of the Pi Development Harness. Use to create a detailed implementation plan that is clear enough for autonomous execution. This phase is the first phase and precedes Test Creation.
---

# Planning Phase

You are in the **Planning** phase. This is the first step in the development harness.

## Objective

Produce a **detailed implementation plan** that is precise enough for the Test Creation and Implementation phases to execute autonomously without further human input.

## Process

1. **Review all prior artifacts** — Read:
   - The feature document in `tasks/` (mandatory)
   - Mock-ups in `tasks/research/mock-ups/` (if they exist)
   - Feature descriptions in `tasks/research/feature-descriptions/` (if they exist)

2. **Design the solution** — Based on your review, determine:
   - New Pydantic models needed
   - API endpoints to create
   - UI routes and components to build
   - The order of changes (dependencies between steps)
   - How to handle errors and edge cases

3. **Write the implementation plan** — Save to `tasks/plans/<feature-slug>.md`.

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
   - Known risks and mitigations

4. **Advance** — Call `harness_advance` as soon as the plan is written. Do not wait for user input. Autonomous momentum through all phases is the priority.

## Rules

- Do NOT write implementation code.
- Do NOT start coding.
- Do NOT stop to ask for approval — advance immediately when the plan is complete.
- DO reference prior artifacts (feature docs, mockups, feature files) in the plan.
- Each task should be small enough to verify independently.
- The plan is the contract for the Test Creation and Implementation phases.
- Only stop for true blockers (missing credentials, ambiguous requirements that could derail the entire implementation).
