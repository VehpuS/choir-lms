---
name: laws-of-ux
description: "Apply practical UX heuristics from Laws of UX to mobile rehearsal player audits and implementation decisions. USE WHEN requests mention usability, clarity, decision fatigue, hierarchy, grouping, touch targets, discoverability, flow friction, or references to lawsofux.com. TRIGGERS: 'laws of ux', 'lawsofux', 'Hick', 'Fitts', 'Jakob', 'Miller', 'cognitive load', 'choice overload', 'make this easier', 'simplify this UI'."
---

# Laws of UX (Mobile Rehearsal Player)

Use this skill to turn broad UX feedback into concrete, testable UI decisions in
`packages/mobile-rehearsal-player`.

Primary goal: reduce user effort while preserving existing product behavior
unless the user explicitly asks for behavior changes.

## Scope

Focus on:

- screen hierarchy and visual grouping
- action discoverability and decision friction
- touch-target acquisition and control density
- progress feedback and perceived responsiveness
- copy clarity and task completion flow

Do not change domain logic by default.

## Execution Protocol

1. Identify the active user task.

- Example tasks: find a track, start playback, set loop range, add to playlist,
  recover from errors.

2. Pick 3 to 5 relevant laws only.

- Avoid applying every law at once.
- Choose laws that explain observed friction on the target screen.

3. Convert each law into an action.

- `Current friction`: what slows users down now.
- `Law signal`: which law explains the friction.
- `Change`: one concrete UI edit.
- `Expected effect`: what improves for users.
- `Validation`: how to check it (typecheck/tests/manual path).

4. Ship the smallest coherent slice first.

- Prioritize the smallest set of edits that removes the highest-friction point.

5. Route parity work to the consistency workflow.

- If recommendations require cross-screen label/order/icon parity, invoke `ui-consistency` to enforce the shared canonical pattern.

## Law-to-Decision Mapping

Use these mappings as a practical checklist.

### Hick's Law + Choice Overload

- Limit competing primary actions per panel.
- Move low-frequency actions into overflow menus.
- Keep destructive actions separated and last.

### Fitts's Law

- Ensure key controls are easy to hit and close to the thumb path.
- Keep critical transport controls large and consistently placed.

### Jakob's Law + Mental Model

- Keep navigation and playback interactions familiar and predictable.
- Reuse patterns already present in Recents, Add, and Library.

### Miller's Law + Chunking + Working Memory

- Break dense option sets into grouped sections.
- Prefer progressive disclosure over long uninterrupted action lists.

### Law of Proximity + Similarity + Common Region + Uniform Connectedness

- Group related controls with spacing and shared containers.
- Keep unrelated controls visually distinct to avoid accidental grouping.

### Tesler's Law

- Accept irreducible complexity, then move complexity behind defaults and good
  presets rather than exposing all controls up front.

### Doherty Threshold

- Show immediate feedback for taps and loading states.
- For long operations, show status copy and allow retry.

### Goal-Gradient Effect + Zeigarnik Effect

- Show clear progress for multi-step tasks.
- Preserve and surface in-progress state so users can resume quickly.

### Peak-End Rule

- Polish completion and failure endpoints (save, added, synced, retry).
- End flows with clear confirmation and obvious next action.

### Aesthetic-Usability Effect

- Use consistent visual rhythm and intentional hierarchy to support confidence.
- Avoid decorative noise that competes with task-critical information.

## Anti-Patterns

- Applying laws as abstract theory without a concrete screen change.
- Solving every issue with more controls instead of fewer decisions.
- Introducing inconsistent patterns across Recents/Add/Library for local gains.
- Shipping broad visual rewrites without validating critical flows.
- Treating cross-screen standardization as ad-hoc edits instead of routing parity updates through `ui-consistency`.

## Output Template

When presenting recommendations, use this compact structure:

- `Surface`: screen or component
- `Task`: user intent
- `Law(s)`: selected laws
- `Issue`: observed friction
- `Change`: exact UI adjustment
- `Expected outcome`: what gets easier/faster/clearer
- `Validation`: checks and manual scenario

## Sources

- https://lawsofux.com/

Use the laws as principles and restate recommendations in repo-specific terms.
