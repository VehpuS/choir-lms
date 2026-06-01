---
name: ui-consistency
description: "Enforce cross-screen UI consistency in the mobile rehearsal player. USE WHEN requests mention consistency, standardization, parity, unifying button order/text/style, overflow menu alignment, icon semantics, or matching behavior across Recents/Add/Library/playlist/queue surfaces. TRIGGERS: 'consistent UI', 'make this match', 'standardize buttons', 'same labels everywhere', 'cross-screen parity', 'overflow menu consistency', 'button order', 'icon consistency'."
---

# UI Consistency (Mobile Rehearsal Player)

Use this skill to keep interaction patterns, copy, and visual treatment consistent across related components and screens in `packages/mobile-rehearsal-player`.

Primary goal: users should not relearn controls when moving between Recents, Library, Add, playlists, and queue surfaces.

Treat `Add` as the middle destination label and reserve `Search` for search actions within Add and Library.

## Scope

Focus on:

- button order and grouping
- action naming/copy
- icon semantics and icon-only control behavior
- overflow menu structure and action ordering
- disabled/pressed/selected states
- touch-target and accessibility parity

Do not change business logic unless required to make inconsistent controls equivalent.

## Baseline Standards

### 1. Primary vs secondary action pattern

- Keep one primary action visually dominant.
- Place lower-frequency actions behind overflow menus where applicable.
- For row-level controls, keep ordering stable within a pattern family.

### 2. Action label consistency

- Same intent must use same label across surfaces.
- Prefer these queue labels:
  - `Play next`
  - `Add to queue`
- Avoid mixed synonyms for identical intent (for example `Play after current` vs `Play next`).

### 3. Icon consistency

- Use one icon semantic per action intent across screens.
- Keep icon-only controls paired with accessibility labels.
- Preserve consistent icon size/weight in similar control groups.

### 4. Overflow menu consistency

- Use vertical ellipsis trigger placement consistently for comparable surfaces.
- Keep action ordering predictable:
  - primary queue actions before navigation or destructive actions
  - destructive actions last

### 5. State treatment consistency

- Disabled state must look and behave consistently (opacity + disabled semantics).
- Pressed feedback should be the same interaction style for similar controls.
- Selected/toggled states must be explicit and not color-only when possible.

## Execution Protocol

1. Discover comparable surfaces first.

- Search for shared action labels/icons/order patterns in related components.
- Build a quick map of mismatches before editing.

2. Define canonical pattern.

- Pick the canonical ordering, labels, and visual treatment based on existing majority/shared patterns.
- If the canonical choice is ambiguous, ask before broad changes.

3. Apply minimal edits.

- Change only inconsistent parts.
- Prefer extracting shared helpers/constants when duplication causes drift.

4. Validate.

- Run `npm exec -- nx run mobile-rehearsal-player:typecheck`.
- Run `npm exec -- nx test mobile-rehearsal-player`.

5. Report deltas.

- List what was standardized and which surfaces were touched.
- Call out any intentionally deferred inconsistencies.

## Recommended Search Targets

- `packages/mobile-rehearsal-player/src/app/screens/**/*.tsx`
- `packages/mobile-rehearsal-player/src/app/library/components/**/*.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/**/*.tsx`
- `packages/mobile-rehearsal-player/src/app/**/screen-copy.ts`

Useful grep patterns:

- `Play next|Add to queue|Play after current|View in library`
- `dots-vertical|ellipsis|overflow|OptionsMenuSheet`
- `disabled|Pressed|accessibilityLabel|accessibilityState`

## Done Criteria

- Equivalent actions share the same label text.
- Equivalent row/card controls follow the same action order.
- Equivalent controls have matching disabled/pressed/accessibility behavior.
- Typecheck and tests pass.
