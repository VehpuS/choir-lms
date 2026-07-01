---
name: implementation-checkpoint
description: 'Pause after a validated implementation slice to collect feedback, coordinate manual testing, and prepare a focused commit. Use after completing an OpenSpec subtask or any review-oriented code slice that needs user approval before continuing.'
---

# Implementation Checkpoint

Use this skill after a focused implementation slice is validated and before moving to the next task.

## When to Use

- A numbered OpenSpec subtask is complete
- The user asked for frequent commits or manual verification
- Auth, playback, mobile, external API, or device behavior changed
- You need approval before creating a commit

## Procedure

1. Run a post-generation quality sweep on touched files before checkpoint handoff:
   - verify VS Code Problems (or `get_errors`) is clean for every touched file
   - run focused lint for touched files (or the narrowest relevant project lint target)
   - if the slice is TypeScript-heavy or refactor-oriented, run a narrow typecheck target when available
   - fix any newly introduced issues before continuing
2. Summarize the completed slice with:
   - the subtask or slice identifier
   - the key files changed
   - the automated tests or validation that ran
   - the remaining risk or manual test need
3. Ask the user for feedback on the implementation before starting another subtask.
4. If the change touches behavior that benefits from manual verification, ask the user for a concrete pass or fail report and suggest 1-3 direct test steps.
5. Propose a focused commit message that matches the completed slice.
6. Ask whether to create the commit now. Only commit after explicit approval.
7. If approved, inspect `git status`, ensure only the intended slice is included, and create the commit.
8. If the user reports issues or rejects the slice, reopen the same task, fix it, and rerun the same validation before proposing another commit.
9. Resume the next numbered subtask only after feedback, manual verification, and commit handling are finished, or after the user explicitly opts out.

## Output Template

```md
### Checkpoint

- Subtask: <id and title>
- Validation: <tests or checks>
- Manual verification needed: <yes or no, plus steps if yes>
- Suggested commit: <message>

Continue, revise, or commit?
```
