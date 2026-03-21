---
name: harness-research
description: Activated during the Research phase of the Pi Development Harness. Use when beginning a new feature to gather context, understand the codebase, and document findings before any design or implementation work.
---

# Research Phase

You are in the **Research** phase. This is always the first phase when adding a new feature.

## Objective

Produce a **research document** that gives you (and any future agent) enough context to design and implement the feature confidently. Do not design or plan yet — only gather and document information.

## Process

1. **Understand the request** — Read the user's feature request carefully. Ask clarifying questions if anything is ambiguous. Do not proceed until you understand what is being asked.

2. **Explore the codebase** — Use `read` and `bash` to examine:
   - Relevant source files, modules, and packages
   - Existing patterns, conventions, and architectural decisions
   - Related tests and how they are structured
   - Dependencies that may be involved

3. **Identify boundaries** — Determine:
   - Which files/modules will need to change
   - Which interfaces or contracts exist at the boundaries
   - What existing functionality must not break

4. **Document findings** — Write a research document at `docs/harness/<feature-slug>/research.md` containing:
   - **Feature summary** — What is being built and why
   - **Codebase context** — Relevant files, modules, patterns found
   - **Boundaries** — Interfaces, contracts, integration points
   - **Risks & unknowns** — Anything uncertain or requiring decision
   - **Dependencies** — External or internal dependencies involved

5. **Register the artifact** — Call `harness_register_artifact` with the path to your research document.

6. **Advance** — Call `harness_advance` with a summary of your findings.

## Rules

- Do NOT write any implementation code.
- Do NOT create implementation plans.
- Do NOT design solutions — only gather information.
- DO ask the user questions if you need clarification.
- DO be thorough — the quality of later phases depends on this research.
