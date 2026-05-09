## Choir LMS Agent Guidance

This repository is an Nx monorepo for a broader choir learning platform. See the [README](README.md) for vision, direction, and development notes.

## Workflow Expectations

- For product or implementation changes, read the relevant OpenSpec proposal, design, specs, and tasks before editing code.
- If a request materially changes scope or behavior, update or create the corresponding OpenSpec artifacts before implementation.
- When creating apps or libraries, keep package boundaries reusable so future choir LMS apps can share domain, auth, media, and storage logic.
- Keep the [README](README.md) updated with any changes to the development focus, repository structure, or workflow expectations.
- For TypeScript and TSX work, follow the repo coding style guidance in `.github/instructions/typescript-coding-style-policy.instructions.md`.
- For automated test work, follow the repo testing guidance in `.github/instructions/testing-policy.instructions.md`.
- When adding or materially expanding code in a language or framework without comparable repo coding style guidance, first draft a suggested policy in `.github/instructions/` and confirm it with the user before proceeding with broader implementation in that language or framework.
- Before suggesting or creating a commit, clear VS Code Problems in every touched file. If Vscode is out of sync with repo configuration, help the user address this. Alternatively, if a touched file is outside the current lint or typecheck surface, extend project validation so `nx lint` or a lint dependency fails until that file is clean.

## Deliberate OpenSpec Implementation

- When implementing from OpenSpec artifacts or using `/opsx:apply`, invoke the `openspec-checkpointed-implementation` skill before writing code.
- Work on exactly one unchecked numbered subtask at a time. Do not silently batch across multiple task checkboxes unless the user explicitly asks for batch mode.
- Before the first edit for a subtask, state the exact task being implemented, the local hypothesis driving the change, and the narrow validation you expect to run. If public API shape, naming, UX, styling, data model, or architecture is still ambiguous after reading nearby code and artifacts, pause and ask the user instead of guessing.
- Add or update automated tests in the same slice for every new behavior, fix, or regression-prone branch, following `.github/instructions/testing-policy.instructions.md`. If automation is not practical, explain why, identify the manual test gap, and ask before skipping tests.
- After completing a subtask, run focused validation, update only that task checkbox, and invoke the `implementation-checkpoint` skill before moving on.
- Each completed subtask is the default commit boundary. Offer a suggested commit message and create the commit only after explicit user approval.
- For auth, native, device, background playback, or third-party integration work, request manual verification before marking the related task complete.
- The user can explicitly opt out of checkpoints, commit boundaries, or the default test expectation for the current session. Otherwise, default to this slower, review-oriented loop.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
