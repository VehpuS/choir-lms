---
description: 'Use when implementing or continuing OpenSpec changes, especially during /opsx:apply or when reading openspec/changes task, design, proposal, and spec files. Enforces one-subtask execution, test coverage, review checkpoints, commit prompts, and manual verification.'
applyTo: 'openspec/changes/**/*.md'
---

# OpenSpec Deliberate Execution

- Default unit of work: one unchecked numbered subtask such as `3.1` or `4.2`.
- Before editing, identify the next subtask, the owning code surface, and the narrow validation that will falsify the plan.
- Ask the user before editing if a nontrivial choice in API shape, naming, UX, styling, data model, or architecture is not already decided by the artifacts or nearby code, or in case the spec docs are ambiguous / missing design guidance.
- After deciding on implementation strategy, update the subtask description in `tasks.md` to reflect the detailed plan, including sub-steps and any relevant design or UX notes. If necessary, update other artifacts such as `design.md`, `spec.md`, or `proposal.md` to clarify the plan, checkpoint with the user before proceeding.
- Add automated tests for new behavior in the same slice. If automation is impractical, say why and ask before leaving the gap.
- When the slice is complete and validated, update only that checkbox in `tasks.md`.
- Then pause. Ask for user feedback, ask whether to create a commit, and ask for manual testing when the change touches auth, native playback, device behavior, or external integrations.
- Do not advance to the next unchecked subtask until the user responds or explicitly switches to batch mode.
- Use `openspec-checkpointed-implementation` for the execution loop and `implementation-checkpoint` for the pause and handoff.
