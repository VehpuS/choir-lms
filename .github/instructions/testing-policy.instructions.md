---
description: 'Use when writing or updating automated tests in this repo. First, choose the test level with the narrowest scope and fewest dependencies that can still validate the behavior. Then prefer reusable helpers, keep mocks rare and justified, and add missing tooling instead of skipping coverage.'
applyTo: '**/*.{spec,test}.{ts,tsx,js,jsx}'
---

# Testing Policy

- Scope: Choose the narrowest test level that can fail for the behavior you are changing. Use unit tests for pure domain logic, component-level integration tests for stateful UI slices and package boundaries, and UI-level tests for user-critical flows that need rendered interaction coverage.
- Same-slice coverage: Add or update automated tests in the same change as every new behavior, fix, or regression-prone branch. If automation is not practical, explain why, identify the manual test gap, and ask before skipping tests.
- Tooling: If the touched surface lacks usable test tooling, add the smallest maintainable harness needed for that surface instead of avoiding tests.
- Reuse: Generate shared test tools, builders, render helpers, and fixtures when they remove repeated setup or make iterative test design faster. Keep helpers thin enough that each test still shows its intent clearly.
- Naming: Keep one filename convention per package. Match the package's existing suffix instead of mixing `*.spec.*` and `*.test.*` within the same package.
- Assertions: Prefer assertions on observable behavior, returned values, rendered output, state transitions, and published side effects over assertions on private implementation details.
- Mocks: Use mocks sparingly, and document your reasons for adding them to a test with comments. Prefer real domain objects, representative fixtures, or lightweight fakes when they keep the test deterministic without hiding behavior.
- Isolation: Reset global state, timers, storage, and network handlers between tests. Tests should be deterministic, order-independent, and safe to run in parallel unless a harness explicitly requires otherwise.
- Readability: Give tests explicit names that describe the scenario and expected outcome. Keep each test focused on one reason to fail.
- Data shape: Prefer factories, builders, and targeted fixtures over large inline objects. Only include fields that affect the scenario being asserted.
- Snapshots: Avoid broad snapshots as primary coverage. Use them only when the output is stable, low-noise, and the snapshot protects meaningful intent.
- Validation: Run the narrowest relevant Nx test path for the affected surface before finishing. If you add a new test harness or target, wire it into project validation so future work uses it by default.
