## 1. Spikes (decide before building)

Web is the build and verification target. Native is deferred to `native-playback-follow-ups` (task 12.1 hands it over); nothing here builds toward it beyond the capability gate in 3.1. If a spike fails, cut scope back (for example speed-only shaping, or in-memory only, or fewer stems) before starting the tasks that depend on it. Use real voice stems (four to nine files of the same song) for every measurement.

- [x] 1.1 Controller audit: list every place that assumes a media element or one TrackPlayer track (`getMediaElement()`, duration probing with a muted play, blob URL bookkeeping, `getSavedTrackPlayer()` callers, remote controls, loop-aware transport, marker and loop owner resolution that assumes a `DriveAudioSource`). Write the list into the design's Spike results and decide how much of Decision 5 the wrapper covers and what needs an item-kind branch. No code changes.
- [x] 1.2 Shaping the sum: in the browser, play four stems from windowed voices through one `AudioContext` into the SoundTouch pitch node, at 0.7×, 1.0× and 1.3× with pitch 0 and ±2 semitones. Compare source `playbackRate` with pitch compensation against SoundTouch tempo on the sum for sound quality on voices, scheduling of windows at a rate other than 1, drift between stems, and clicks at changes. Decide the speed method (design Decision 4) and what the windowed voice needs for a rate.
- [x] 1.3 Voices, memory and first open: with four, six and nine stems of 3 to 5 minutes, measure decoded size, peak memory while preparing one stem at a time, CPU with all windowed voices playing, read-ahead behaviour at a loop wrap, and the time from pressing play to sound for the in-memory path against prepared storage (cold and warm). Decide the tier rule and the first budget (design Decision 9), and whether the in-memory path is worth building at all.
- [x] 1.4 Export render: render a nine-stem composite at 0.7× with a pitch shift through `renderMix` extended to several sources and the stretcher shaping the summed chunks; measure time and memory, and compare the result with a live capture of the same mix. Decide the chunk size and whether a worker is needed (design Decision 13).
- [x] 1.5 Review `design-source/composite-mock.html` with the user: the Library row, badge and filter, the selection bar with `Make composite…`, the create sheet with stem names, the large-composite and no-room states, loading and preparing, the Mix panel with presets, solo and collapsed states, save preset, stem options, missing stem, lyrics, sheet music and the export dialog. Reviewed with the user on 2026-11-06 and approved with the revisions recorded in the design (no positive memory message, explicit stem names, `Make composite…` as one bulk action, tiered memory handling, `Clear offline files…`, combined sheet music and the lyrics picker).

## 2. Models and pure logic

- [ ] 2.1 Add the `CompositeTrack` record and helpers to `audio-library-models`: types, parsing and normalisation at the storage boundary, default names, `guessStemName(trackName)` reusing the voice-section word patterns, offset and duration math (padding, negative offsets), and the one-second length-difference check. Spec with names that match one section, none and several, and stems with offsets.
- [ ] 2.2 Add the mark-as-my-part logic: a stem marks as the user's part when its name classifies to a section in the part preferences, with a manual override. Spec with and without preferences and with several preferences.
- [ ] 2.3 Add the pure mix model: `resolveStemGains(stems, mix)` (mute, solo, 0 to 150%), the built-in presets (`All parts`, `Without <mine>`, `<Mine> louder`), saved presets, the default mix, the session mix reducer with `Custom mix` and reset, and the summary line (`Without Bass · 3 of 4 sounding`). Put the stem types and `resolveStemGains` in `@org/audio-mixing`. Spec mute over solo, several solos, no `mine` stem and presets that name a missing part.
- [ ] 2.4 Add the missing-stem and availability model: given a composite and the library, return each stem's state (available, missing, loading) and the composite's state (playable, partly playable, unavailable), plus re-link and remove rules (a composite with one stem left asks to be deleted). Spec with a deleted track, a re-linked track and no stems left.
- [ ] 2.5 Add the content models: the sheet music union with de-duplication by location and the stems that use each source (no cap on the union), and the lyrics picker model (stems that have lyrics, default and remembered pick). Spec with shared files, a file added to the composite, one stem with lyrics and none.
- [ ] 2.6 Add the waveform combination: per-stem peak columns plus gains to composite columns (`sqrt(Σ (gain × peak)²)` clipped to 1) in `audio-library-models` next to `waveform-peaks.ts`. Spec with a muted stem, a boosted stem and stems of different lengths.
- [ ] 2.7 Add the storage estimate and fit model (spike 1.3: prepared storage only, no memory tier): from the stems' durations, channel counts (mono when channels are identical) and the browser's storage estimate behind an interface, return the bytes needed and whether they fit (`fits`, `does-not-fit`, `unknown` when the browser cannot say). Spec the estimate and the no-signal case.

## 3. Playback engine

- [ ] 3.1 Add `compositeCapabilities()` like `recordingCapabilities()`: web with Web Audio and the prepared-stem store can play composites, native cannot. Wire it so a composite item on an unsupported platform is unavailable with the message and no error. Spec the gate.
- [ ] 3.2 Build the engine graph in the app (`library/composite/engine/`): per-stem voice and gain into a sum bus, the SoundTouch pitch node when pitch is not 0, the mix limiter without make-up gain, a master gain; play, pause and seek scheduled at one context time; position, duration and state; and the speed method chosen in 1.2. Extend `createWindowedVoice` with the rate parameter spike 1.2 needs: a `rate` option (windows placed at `anchor + (windowStartMs − fromMs) / (1000 × rate)`, `source.playbackRate = rate`), a 64-sample baked crossfade overlap between windows (without it 0.7× clicks at window joins), and a rate change as a re-anchor like a seek; speed is source `playbackRate` per voice with the pitch node's `playbackRate` mirrored (SoundTouch has no tempo parameter). Spec the scheduling logic with fake contexts; verify audio in the browser preview.
- [ ] 3.3 Add stem loading: resolve each stem's track through the normal path (playback cache, offline store, Drive), read it into the voice for the chosen tier, report per-stem progress, skip and flag a stem that fails, and cancel cleanly when superseded. Spec with a fake loader, including a failure and a superseded load.
- [ ] 3.4 Add the composite-aware player wrapper behind the player interop (design Decision 5): route load, play, pause, seek, volume and rate for composite items to the engine and report progress and state through the existing events; delegate everything else unchanged. Apply the item-kind branches found in spike 1.1 (`loadIntoPlayer`, duration resolution), add the hook seam so `useSavedTrackPlayerPlaybackState`, `useSavedTrackPlayerProgress` and `useSavedTrackPlayerEvents` follow the active engine, still call RNTP `reset` on load so the media element and blob URLs are released, and make the recording overlay and punch-in unavailable for a composite with a message. Spec the routing with fakes; confirm the existing track playback specs still pass.
- [ ] 3.5 (decided: a `'composite'` `PlayableItemKind` with a synthetic `DriveAudioSource`, see design Spike results 1.1; audit each `kind === 'track' | 'loop'` branch) Add the composite playable item and playlist entry kind (`composite`): creation, label, queue and playlist behaviour, and the unavailable state for an unknown kind. Spec like the recording item and entry.
- [ ] 3.6 Connect shaping: make the engine the shaping engine for a composite item so speed and pitch and their locks behave as for a track. Spec; verify in the browser preview with the controls.
- [ ] 3.7 Loops and markers on a composite: store them against the composite id in composite time, extend owner resolution, and make the loop-aware transport wrap the engine with read-ahead at the loop start. Spec the owner resolution and a wrap.

## 4. Prepared stems

- [ ] 4.1 Build the prepared-stem store (IndexedDB, `.web`, with a native file that is unavailable): chunked 16-bit PCM keyed by composite, stem and track content version, written one stem at a time, read through `createWavWindowReader`, total size, delete per composite and all. Spec with a fake IndexedDB, including a write failure and a replaced content version.
- [ ] 4.2 Add preparation: decode one stem at a time, detect identical channels and prepare as mono, resample to the context rate, write chunks, report progress, and compute peaks for the waveform. Spec with synthetic signals (stereo, identical-channel stereo, a different sample rate).
- [ ] 4.3 Add the storage-full handling: a pure model from a write failure or a pre-check to the no-room state and its actions, with no counts. Spec; record how the browser reports quota in the design.
- [x] 4.4 Dropped by spike 1.3: prepared storage only, so there is no in-memory voice or tier switch (design Decision 9 and Spike results 1.3).

## 5. Creating a composite

- [ ] 5.1 Add `Make composite…` to the Library bulk bar and its model: offered for two or more tracks, emphasised with the same-length line only when all durations match to within one second, and the differing-length count line otherwise. Update the multi-selection specs.
- [ ] 5.2 Build the create sheet model and view: name, a row per track with an editable stem name and the `named from the track` note, the length warning, the large-composite note, the no-room state with `Create` unavailable, and waiting for unknown durations. Spec the model; verify in the browser preview.
- [ ] 5.3 Add the composite store in local library storage (`composites` collection, parse at the boundary), create, rename, delete and the stem edits (rename, offset, `This is my part`, remove, re-link). Spec with the existing local-library-storage specs and a build that does not know the collection.
- [ ] 5.4 Build the stem options sheet: name, `This is my part`, offset steppers, remove and `Show original track`. Spec the model; verify in the browser preview.

## 6. The mixer

- [ ] 6.1 Build the Mix panel: header with collapse and the summary line, the stem rows (mute, solo, 0 to 150% slider, value, `Your part`, options), dimmed silent rows and the `Stem missing` row with `Re-link` and `Remove`. Spec the model and the row component with `@testing-library/react-native/pure`; verify in the browser preview.
- [ ] 6.2 Connect the panel to the session mix store and the engine: gain ramps without clicks, the session mix starts from the default and resets on item change. Spec the store; verify audio in the browser preview.
- [ ] 6.3 Build the presets menu and `Save as preset` sheet: built-in, saved, reset to the saved default, make a preset the default, and hide the part presets when no stem is marked. Spec the models; verify in the browser preview.
- [ ] 6.4 Add the loading and `Preparing stems · first time only` states to the playback screen with per-stem progress, and the superseded behaviour. Spec the models; verify in the browser preview with a throttled connection.
- [ ] 6.5 Draw the composite waveform from the combination in 2.6 so it follows the mix, with position, loops and markers as for a track. Spec the model; verify in the browser preview.

## 7. Library surfaces

- [ ] 7.1 Add the composite row in the Library, Recents and search with the `Composite · N stems` badge, the row menu (rename, delete, `Keep offline`, add to playlist, queue) and the `Composites` filter. Spec the models; verify in the browser preview.
- [ ] 7.2 Add composites to playlists and the queue: add, play, remove, and the unavailable state when every stem is gone. Spec.
- [ ] 7.3 Add `Keep offline` and `Remove from offline` for a composite through the existing track actions, with wording that it applies to all stems. Check the existing keep-offline code first. Spec the model and executor.

## 8. Lyrics and sheet music

- [ ] 8.1 Show the combined sheet music view for a composite (union, used-by line, `Add sheet music to this composite`) by composing the existing sheet music view with the model from 2.5. Spec; verify in the browser preview.
- [ ] 8.2 Show the lyrics view for a composite with the stem picker and the remembered pick, and edit-through to the picked stem. Spec; verify in the browser preview.

## 9. Offline files and storage

- [ ] 9.1 Add the `Prepared composites` group to the offline files view and make `Clear all` clear prepared stems, with the confirmation updated. Update the offline files specs.
- [ ] 9.2 Add `Clear offline files…` to the no-room messages, opening the existing `Clear all` confirmation and retrying afterwards. Spec the model.

## 10. Export

- [ ] 10.1 Extend `renderMix` in `@org/audio-mixing` with the multi-source mode (stem readers, offsets, gains, per-chunk sum, then the stretcher on the sum, then the limiter) and its render plan, using the chunk size from spike 1.4. Spec against a small known case and compare level with the live path.
- [ ] 10.2 Add the composite flavour to the export dialog (description, estimate, file name `<composite> · <preset>.wav`, missing stems named, preparing stems first) and wire the download and Drive destinations. Spec the model; verify a download and a Drive upload.
- [ ] 10.3 Confirm exporting leaves the session mix, saved presets and playback untouched. Spec.

## 11. Verification and docs

- [ ] 11.1 Verify in the browser preview: create from four stems, play, mute, solo, presets, shaping, loop wrap, seek, a missing stem, a large composite (preparing, then quick), offline, and export. Fix anything found.
- [ ] 11.2 Update `docs/mobile-cross-platform-audio-playback.md` (composite engine, tiers, prepared stems, wrapper), the README and the CLAUDE.md notes (workspace layout and `@org/audio-mixing` description).
- [ ] 11.3 Run the affected Nx targets (`lint`, `test`, `typecheck`, `build`) for `audio-library-models`, `audio-mixing` and `mobile-rehearsal-player`, and clear Problems in every touched file.

## 12. Handoffs and follow-ups

- [ ] 12.1 Add composite playback on native to `native-playback-follow-ups` (its tasks and proposal), noting the engine and prepared-stem store are web only here.
- [ ] 12.2 Record the later optimisations in the design or a follow-up change: the `focus` mode that pre-renders the stems the user is not adjusting into one cached bed, and syncing composites between devices.
