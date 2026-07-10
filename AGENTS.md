## Choir LMS Agent Guidance

This repository is an Nx monorepo for a broader choir learning platform. See the [README](README.md) for vision, direction, and development notes.

## Workflow Expectations

- For product or implementation changes, read the relevant OpenSpec proposal, design, specs, and tasks before editing code.
- If a request materially changes scope or behavior, update or create the corresponding OpenSpec artifacts before implementation.
- When creating apps or libraries, keep package boundaries reusable so future choir LMS apps can share domain, auth, media, and storage logic.
- Keep the [README](README.md) updated with any changes to the development focus, repository structure, or workflow expectations.
- For cross-platform playback changes in the mobile app, review `docs/mobile-cross-platform-audio-playback.md` first.
- For workspace manifests, lockfiles, Nx target wiring, and CI-facing target behavior, follow `.github/instructions/workspace-install-and-target-policy.instructions.md`.
- For TypeScript and TSX work, follow the repo coding style guidance in `.github/instructions/typescript-coding-style-policy.instructions.md`.
- For TypeScript and TSX work in `packages/mobile-rehearsal-player/src/`, also follow `.github/instructions/mobile-rehearsal-folder-structure.instructions.md`.
- For automated test work, follow the repo testing guidance in `.github/instructions/testing-policy.instructions.md`.
- For cross-screen UI consistency updates in the mobile rehearsal player, invoke the `ui-consistency` skill in `.github/skills/ui-consistency/SKILL.md`.
- For mobile rehearsal player naming, test naming, file moves, and folder-organization work, invoke the `mobile-folder-structure` skill in `.github/skills/mobile-folder-structure/SKILL.md`.
- For code relocation tasks that need file-embedded progress markers and user checkpoints (instead of chat-context tracking), invoke the `code-move-checkpointed` skill in `.github/skills/code-move-checkpointed/SKILL.md`.
- For browser-only bugs or web playback failures in the mobile rehearsal player, invoke the `mobile-web-runtime-debugging` skill in `.github/skills/mobile-web-runtime-debugging/SKILL.md`.
- For debugging flows that require app authentication, checkpoint with the user and ask them to authenticate in the app before proceeding.
- When adding or materially expanding code in a language or framework without comparable repo coding style guidance, first draft a suggested policy in `.github/instructions/` and confirm it with the user before proceeding with broader implementation in that language or framework.
- Before suggesting or creating a commit, clear VS Code Problems in every touched file. If Vscode is out of sync with repo configuration, help the user address this. Alternatively, if a touched file is outside the current lint or typecheck surface, extend project validation so `nx lint` or a lint dependency fails until that file is clean.

## Deliberate OpenSpec Implementation

- For OpenSpec execution, follow `.github/instructions/openspec-deliberate-execution.instructions.md`.
- Use `openspec-checkpointed-implementation` for the one-subtask execution loop and `implementation-checkpoint` for the validated pause, feedback, manual verification, and commit handoff.
- The user can explicitly opt out of checkpoints, commit boundaries, or the default test expectation for the current session. Otherwise, default to this slower, review-oriented loop.

## Workspace Tooling

- This workspace uses npm workspaces with the committed root `package-lock.json`.
- When repo-specific guidance conflicts with generic Nx examples, prefer `npm exec -- nx ...` for workspace tasks and `npm ci` for install validation.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (in this repo, `npm exec -- nx ...`) - avoids using globally installed CLI
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
