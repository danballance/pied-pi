---
name: harness-feature-descriptions
description: Activated during the Feature Descriptions phase of the Pi Development Harness. Use when the feature needs Cucumber-style BDD specifications that will drive Playwright end-to-end tests.
---

# Feature Descriptions Phase (Optional)

You are in the **Feature Descriptions** phase. This phase is optional and applies when the feature benefits from behavior-driven specifications that will drive end-to-end tests.

## This phase is optional

Before starting, **ask the user** whether they want Cucumber-style feature descriptions for this feature. These are most useful when the feature has significant user-facing behavior that should be covered by end-to-end tests. If the user prefers to skip, call the `harness_skip` tool with `phase: "feature-descriptions"` and a brief reason. Only proceed with the steps below if the user confirms.

## Objective

Write Cucumber-style `.feature` files that describe the expected behavior from the user's perspective. These will later be used to generate Playwright end-to-end tests during implementation.

## Process

1. **Review research** — Read the research document. If mock-ups exist, review those too.

2. **Identify scenarios** — Break the feature into concrete user-facing scenarios:
   - Happy paths
   - Edge cases
   - Error states

3. **Write feature files** — Use Gherkin syntax. Save to `docs/harness/<feature-slug>/features/`.

   Example structure:
   ```gherkin
   Feature: <Feature name>
     As a <role>
     I want <capability>
     So that <benefit>

     Scenario: <Happy path>
       Given <precondition>
       When <action>
       Then <expected result>

     Scenario: <Edge case>
       Given <precondition>
       When <action>
       Then <expected result>
   ```

4. **Review with user** — Present the feature descriptions and iterate on feedback.

5. **Register artifacts** — Call `harness_register_artifact` for each `.feature` file.

6. **Advance** — Call `harness_advance` when the user approves the descriptions.

## Rules

- Do NOT write implementation code or test code yet.
- Do NOT create the implementation plan yet.
- DO focus on user-visible behavior, not internal mechanics.
- If the user decides feature descriptions aren't needed, call `harness_skip` instead.
