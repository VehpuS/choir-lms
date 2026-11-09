## 1. Design with the user

- [ ] 1.1 Explore and record the entry points (composite menu, Recordings list, Mix panel), the default stem name and whether the stem is `mine` by default.
- [ ] 1.2 Update `design.md` with the decisions.

## 2. Models and storage

- [ ] 2.1 Add a stem source kind (track or recording) in `audio-library-models`, with tests.
- [ ] 2.2 Resolve a recording stem's audio and offset from its clock anchor, with tests.
- [ ] 2.3 Key the prepared stems cache by source kind and id.

## 3. UI

- [ ] 3.1 Add `Add recording as stem` from a composite and from the Recordings list.
- [ ] 3.2 Show the stem in the Mix panel with the missing state when the recording is gone.
- [ ] 3.3 Verify in the browser preview: add a recording, play in step, mute, delete the recording.

## 4. Validation

- [ ] 4.1 Run `lint`, `test`, `typecheck` and `build` for the affected projects and clear Problems in touched files.
