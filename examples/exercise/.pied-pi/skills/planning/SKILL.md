# Planning Phase

Read the workspace thoroughly before writing any code.

## Steps

1. Read `/workspace/prompt.md` to understand the task requirements.
2. Explore `/workspace/codebase/` — read every file, understand the existing structure, protocols, and stub implementations.
3. Study `/workspace/tests/` — read every test file to understand what the tests expect, including the test codebase fixtures under `/workspace/tests/codebase/`.
4. Identify the conventions used in the test codebase (decorators, DTOs, handler patterns, XML config format).
5. Write a concise implementation plan to `/workspace/plan.md` covering:
   - How you will implement `SchemaGenerator`
   - Which Python modules/techniques you will use (importlib, inspect, pydantic introspection, etc.)
   - How you will handle each aspect: XML config parsing, handler discovery, request/response DTO introspection, OpenAPI schema construction
   - Any edge cases you've identified from the tests

## Deliverables

- `/workspace/plan.md` exists with a concrete implementation plan.

When your plan is written, call `harness_advance` with a summary of what you learned.
