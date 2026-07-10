---
name: code-move-checkpointed
description: 'Move code from existing files using file-embedded progress markers instead of chat memory. Use when relocating functions, classes, hooks, models, constants, or helper blocks across files with checkpoint pauses for semantic changes.'
---

# Code Move Checkpointed

Use this skill to move code in a deterministic, auditable way without relying on conversation context for progress tracking.

## Core Rule

Progress tracking must live in source files, not in chat history.

Use distinct marker prefixes:

- `PRE-MOVE:` for planned moves that still need execution
- `POST-MOVE:` for completed moves awaiting verification cleanup

## Marker Format

Use language-appropriate comment syntax (`//`, `#`, `/* */`, etc.) and keep this payload shape:

```text
PRE-MOVE: id=<unique-id>; dest=<workspace-relative-path>; symbol=<name-or-block>; reason=<optional>
```

After a move is completed, replace with:

```text
POST-MOVE: id=<same-id>; dest=<workspace-relative-path>; symbol=<name-or-block>; status=moved; notes=<applied-adjustments-or-none>
```

Requirements:

- `id` must be unique per move block.
- `dest` must be explicit and workspace-relative.
- `symbol` should identify exactly what was moved.
- `notes` must summarize any edits made during relocation so verification can compare intent vs result.

## Session Resumption (No Context)

This workflow must be resumable from a brand-new session using only repository state.

Resume rules:

- Never rely on conversation history to decide what step is next.
- Reconstruct progress by scanning files for `PRE-MOVE:` and `POST-MOVE:` markers and inspecting source and destination code.
- Treat marker + code state as the only source of truth.

Resume algorithm:

1. Discover outstanding markers.

- Search for all `PRE-MOVE:` and `POST-MOVE:` comments in the repo.
- Group markers by `id`.

2. Recompute state per `id` from code, not memory.

- `PRE-MOVE` + source block still active + destination missing block: not started for that `id`; execute move flow step 3.
- `PRE-MOVE` + source block commented out + destination has block: move likely completed but marker not transitioned; replace with `POST-MOVE:` and continue verification flow.
- `PRE-MOVE` + destination has block + source block still active: ambiguous or duplicate state; checkpoint with user before editing.
- `POST-MOVE` + destination has expected block + source block is commented out: ready for verification cleanup; remove `POST-MOVE:` comment.
- `POST-MOVE` + destination missing/mismatched block: verification failure; checkpoint with user.

3. Resolve invalid states before continuing.

- If the same `id` appears in multiple source locations, checkpoint.
- If destination path in marker does not exist and no file can be created safely from current context, checkpoint.
- If marker metadata and code disagree on symbol identity, checkpoint.

4. Continue from earliest incomplete state.

- Process all remaining `PRE-MOVE:` markers first.
- Then process all `POST-MOVE:` markers.

5. Re-run compile/typecheck validation after resumed work.

- Validate source and destination files exactly as in the normal workflow.
- If failures require non-trivial interpretation, checkpoint.

Required operator behavior on resume:

- Start each resumed run with a short "reconstructed state" summary derived from current markers and files.
- Keep existing marker `id` values stable; do not rename `id`s mid-stream.
- If user direction changes after a checkpoint, update marker metadata before proceeding so the repo state remains self-describing.

## Required Execution Order

1. Insert pre-move comments at source locations.

- Add a `PRE-MOVE:` comment directly above each code block to move.
- Include destination path and symbol metadata.

2. Create destination files if needed.

- Create missing destination files before processing moves.

3. Process each pre-move comment.

- Move the code block from source to destination.
- If semantic changes are required (imports, references, visibility, exports, types, call sites), checkpoint with the user before applying those changes.
- After user direction, update the `PRE-MOVE:` comment with clarified instructions if needed, then continue.
- Comment out the original source block (do not delete immediately).
- Replace `PRE-MOVE:` with `POST-MOVE:` and include accurate `notes` describing any applied adjustments.

4. Verify all post-move comments.

- For each `POST-MOVE:` marker, confirm destination contains the moved block and nothing was lost relative to the post-move metadata.
- If discrepancies exist, checkpoint with the user before further edits.
- Once verified or resolved, remove the `POST-MOVE:` comment from the source file.

5. Validate source files.

- Ensure each source file remains valid and compiles after all moves.
- If issues arise, checkpoint with the user before making non-trivial repairs.

6. Validate destination files.

- Ensure each destination file is valid and compiles after all moves.
- If issues arise, checkpoint with the user before making non-trivial repairs.

## Checkpoint Rules

Checkpoint immediately when:

- A move needs semantic edits beyond mechanical relocation.
- Verification finds mismatch between `POST-MOVE:` metadata and destination content.
- Source or destination validation fails and the fix is not purely mechanical.

When checkpointing:

- State the move `id`, source path, destination path, and exact issue.
- Propose one or more concrete resolution options.
- Wait for explicit user instruction before proceeding.

## Completion Criteria

- No `PRE-MOVE:` comments remain.
- All `POST-MOVE:` comments are verified and removed.
- Source and destination files pass relevant compile/typecheck validation.
- Source files preserve commented historical blocks until verification passes, then keep or remove per user instruction.
