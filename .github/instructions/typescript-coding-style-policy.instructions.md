---
description: 'Use when writing or refactoring TypeScript and TSX in this repo. Prioritize typed boundaries, shared reuse, and maintainable structure, then apply naming, constant, regex, and readability conventions.'
applyTo: '**/*.{ts,tsx}'
---

# TypeScript Coding Style

- Priority order: keep parsing, normalization, and validation at typed boundaries first; reuse shared domain helpers and types next; then apply file structure and local readability conventions.
- Boundaries: Keep parsing, normalization, and validation at the boundary where data enters the system. Pass typed, already-normalized values deeper into domain logic.
- Reuse: Reuse shared domain helpers and types from workspace packages before duplicating logic in apps or feature files.
- Structure: Keep files at 300 lines or fewer when possible. If a file exceeds 300 lines, extract helpers, types, hooks, services, or components. Keep a larger file only when splitting it would make one tightly coupled flow harder to follow.
- Structure: Prefer small, single-purpose functions with explicit inputs and outputs. If a function is hard to name or summarize, split it.
- Structure: Favor early returns and guard clauses over deep nesting.
- Readability: Prefer named constants and helper variables over repeated string, number, or boolean literals. Avoid magic values in conditionals, object construction, and JSX props.
- Readability: Define reusable regular expressions at module scope, give them descriptive names, and reuse them instead of recreating them inside functions.
- Readability: Prefer `es-toolkit` helpers over ad hoc built-in JavaScript chains. If a touched package needs `es-toolkit` for the first time, add the dependency as part of the same change instead of reimplementing the helper locally.
- Exports: Prefer named exports over default exports for shared code so refactors and imports stay explicit.
- Package boundaries: Keep shared package code framework-agnostic unless the package is explicitly app-facing / framework-specific.
- Maintenance: Match the repo formatter expectations by running it on changed files.
- Comments: Add comments where the intent is not obvious from the code itself.
- Linting: Add linters and lint rules to help enforce these conventions in new nx packages and apps.
