# Scope Discipline

Keep design work visually focused unless the user expands the scope.

## Touch

- card, sheet, and shell styling
- spacing, typography, and alignment
- icon and label treatments
- modal presentation polish
- accessible labels, hints, and contrast fixes
- low-risk copy tightening for clarity

## Do Not Touch

- feature-owned library state in `library/saved-rehearsal-library/` or `library/**/hooks/` unless the visual design truly requires new UI state
- playback runtime in `use-saved-track-playback`
- domain logic in `@org/audio-library-models` or `@org/audio-library-runtime`
- Drive discovery or auth behavior
- playlist persistence or loop-saving behavior

## Decision Tree

- If the improvement is purely visual, proceed.
- If it needs one new view prop or local UI state, proceed and note it.
- If it changes navigation, persistence, playback semantics, or package boundaries, stop and confirm scope.

## Ask Before Proceeding

Use this when the design implies a product decision:

"I noticed the current UI would need a behavior change to support this design cleanly. Before I design for that, do you want the scope to include [specific behavior change]?"
