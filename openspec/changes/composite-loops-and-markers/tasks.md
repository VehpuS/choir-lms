## 1. Design with the user

- [ ] 1.1 Explore and record the entry points (playback sheet overflow, Composites row menu, Files composite menu, Mix panel) and where a composite's markers and loops are listed.
- [ ] 1.2 Update `design.md` with the chosen entry points.

## 2. Models and storage

- [ ] 2.1 Add a `composite` owner kind for loops in `audio-library-models`, with tests.
- [ ] 2.2 Add the loops collection write path for a composite owner in `audio-library-runtime`, with tests.
- [ ] 2.3 Add marker add, edit and remove to the composite store, with tests.

## 3. Playback

- [ ] 3.1 Play a composite loop as the same range of the mix, wrapping in the composite engine.
- [ ] 3.2 Clamp loop and marker positions when the composite length changes.

## 4. UI

- [ ] 4.1 Offer `Make loop` and the marker editor for a playing composite.
- [ ] 4.2 List a composite's loops and markers using `createCompositeOwnerSources`.
- [ ] 4.3 Verify in the browser preview: make a loop, play it, add a marker, delete the composite.

## 5. Validation

- [ ] 5.1 Run `lint`, `test`, `typecheck` and `build` for the affected projects and clear Problems in touched files.
