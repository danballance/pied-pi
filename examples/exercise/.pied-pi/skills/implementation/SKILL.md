# Implementation Phase

Implement the solution according to your plan.

## Task

The `/workspace/codebase/` directory contains a `SchemaGenerator` class with stub methods.
Implement it so that it reads Python source code and produces a valid OpenAPI 3.0.3 YAML schema.

### Interface

The `SchemaGenerator` class must satisfy `SchemaGeneratorProtocol`:

- `set_code_directory(path: Path)` — sets the root directory containing the source code and config to analyse.
- `generate() -> str` — analyses the code and returns the OpenAPI YAML string.

### The OpenAPI Standard to meet

**IMPORTANT**: Where an endpoint can return more than one response body type,
you must use a `oneOf` construct.
Merging the types together and using optional fields is a failure condition.

### Success criteria

The code in `/workspace/tests/codebase/` consists of two HTTP handlers — one for a `GET|POST /login` endpoint and the other for `GET /profile`.

All tests in `/workspace/tests/` must pass — but please see this as a minimum standard.
The tests only cover the `GET|POST /login` endpoint.
You must still ensure that your code generates correct schema for the `GET /profile` endpoint too.

## Process

1. Implement `SchemaGenerator` following your plan from the planning phase.
2. Run the tests: `cd /workspace && python -m pytest tests/ -v`
3. Iterate until all tests pass.
4. Review your implementation for correctness on the `GET /profile` endpoint.

## Deliverables

- All tests in `/workspace/tests/` pass.
- The `GET /profile` endpoint is correctly handled.

When all tests pass, call `harness_advance` with a summary of your implementation.
