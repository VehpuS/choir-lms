---
name: openspec-checkpointed-implementation
description: 'Structured implementation loop for OpenSpec changes. Use when running /opsx:apply, implementing tasks from openspec/changes/**/tasks.md, or continuing an OpenSpec change and you need one-subtask execution, test creation, validation, feedback pauses, commit prompts, and manual verification.'
---

# OpenSpec Checkpointed Implementation

This skill turns OpenSpec implementation into a reviewed loop instead of a rapid multi-task sweep.

## When to Use

- Running `/opsx:apply`
- Implementing tasks from `openspec/changes/**/tasks.md`
- Continuing a partially completed OpenSpec change
- The user wants commits, tests, feedback pauses, manual verification, or coding-style decisions surfaced during execution

## Procedure

1. Load the active change artifacts: proposal, design, specs, and tasks, plus the nearest controlling code and nearby tests.
2. Select exactly one unchecked numbered subtask. Treat that subtask as the only implementation scope until it is validated or blocked.
3. Before editing:
   - announce the exact subtask
   - state one local hypothesis about the controlling code path or failure mode
   - state the cheapest discriminating validation you expect to run
   - identify any unresolved user-facing or architecture-level decisions
4. If unresolved decisions affect public API shape, naming, UX, styling, data model, or architecture, ask the user before editing. Do not ask about trivial local choices already decided by nearby code.
5. Implement the smallest slice that can satisfy the subtask.
6. Add or update automated tests for new behavior in the same slice. Prefer the narrowest existing test surface. If no practical automated test exists, explain why and record the manual verification that will be needed.
7. Run focused validation immediately after the edit. Prefer narrow behavior checks, then narrow tests, then a targeted typecheck and lint pass for the touched slice when those targets exist, then targeted build commands when they are still needed.
8. Before marking the task complete or handing off to checkpoint, run a touched-files quality sweep:
   - verify VS Code Problems (or `get_errors`) for every touched file
   - run focused eslint or the narrowest lint target covering touched files
   - check whether any touched file exceeds the repo-recommended file length; if a file exceeds and the fix requires moving code, invoke `code-move-checkpointed` and complete its marker-driven move workflow before task completion
   - fix any newly introduced warnings or errors in touched files
   - if warnings remain only outside touched files, call that out explicitly
9. If validation fails but the defect is still local to the slice, repair it and rerun the same validation before expanding scope.
10. Once the slice passes:

- update only the completed checkbox in `tasks.md`
- stop implementation
- hand off to `implementation-checkpoint`

11. Do not start the next unchecked subtask until the user explicitly says to continue.

## Guardrails

- Default to one commit per completed numbered subtask.
- Do not mark a task complete before code, tests, and validation line up.
- Do not leave file-length overages unresolved when extraction or relocation is required; use `code-move-checkpointed` instead of ad-hoc moves.
- Do not treat tests alone as sufficient when the touched slice has relevant typecheck or lint targets; run those targeted passes before marking the task complete.
- Do not checkpoint a slice until touched-file Problems and lint sweeps are complete.
- Do not batch task checkboxes to save time unless the user explicitly overrides the default workflow.
- If the artifacts conflict with the code reality, pause and recommend artifact updates before continuing.
