## 1. Spikes

- [x] 1.1 Piano samples: find a sample set whose licence allows bundling and redistribution (CC0 or equivalent), about one sample every minor third from C2 to C7, compress to ≤ 1.5 MB total (for example OGG/AAC), and record the source and licence in the repo. If none fits, build the additive-synthesis fallback behind the same `PianoVoice` interface (design Decision 4). Record the outcome here.
  - Outcome (2026-10-19): no sample set with a verified redistributable licence was found (a web search surfaced only single-octave clips and the Philharmonia samples, whose licence forbids redistributing them as samples). Per design Decision 4 the default `Piano` is the additive-synthesis voice (`synth-piano-voice.ts`) behind the same `PianoVoice` interface. Recorded samples are a future task (9.1).
- [x] 1.2 Web Audio check: confirm in the browser preview that a separate `AudioContext` plays over the playing track without affecting the shaping graph, that `resume()` works from the first key press, and the first-press latency with the samples cold and warm. Record the numbers here.
  - Outcome (2026-10-19, Chrome in the browser pane): the piano's own `AudioContext` is created and `resume()`d when the overlay opens (a user gesture), and is `running` by the first key press. A key press creates its oscillators 0.3 ms after the pointer-down (no sample load; the synthesized voice has nothing to fetch), with `baseLatency` 5.8 ms and `outputLatency` 24 ms. The context is separate from the shaping graph by construction (it shares nothing with the track's nodes); the over-a-playing-track check is part of 8.1. Cold/warm latency does not differ without samples; revisit with task 9.1.
- [ ] 1.3 OSMD hit-testing: confirm how to map a pointer position to a notehead and its pitch (via `GraphicSheet` or the SVG note groups) at each viewer zoom step, including a MIDI-converted score and a part with `<transpose>`. Record the chosen approach in design Decision 7.

## 2. Pitch model

- [x] 2.1 Add framework-agnostic pitch helpers to `packages/audio-library-models`: MIDI number ↔ note name with octave (sharp and flat spelling), MIDI → frequency (A4 = 440), and MusicXML pitch (`step`, `alter`, `octave`, optional `<transpose>` `chromatic` / `octave-change`) → sounding MIDI number. Spec the helpers, including A0, C8, C4 = 60, accidentals, and a transposed part. Export through the package index.
- [x] 2.2 Add a keyboard layout model in the app (`library/piano/`): the 88 keys with white/black classification, left offset and width, label for a key given `showAllNoteNames` and `accidentals`, and the scroll offset that centres a given MIDI number or range. Spec it, including no label other than C by default and the centring edge cases at both ends.

## 3. Preferences and voices

- [x] 3.1 Add the `piano-preferences` store (`choirlms.piano.*`): `sound`, `volume`, `accidentals`, `showAllNoteNames`, and the overlay state (`isOpen`, `isCollapsed`, `heightStep`, `scrollLeft`), parsed and clamped at the read boundary (design Decision 8). Spec defaults, clamping, an unknown sound, and a storage failure falling back to defaults.
- [x] 3.2 Add the `PianoVoice` interface and `pianoCapabilities()` (design Decisions 4 and 5) with the capability flag spec for web with and without `AudioContext` and for native.
- [x] 3.3 Add the web `Organ` voice (oscillator stack, attack, sustain, release) with a spec against a fake `AudioContext` for attack, release, volume, and polyphony cap.
- [x] 3.4 Add the web `Piano` voice as the additive-synthesis fallback (task 1.1 outcome): a decaying stack of six inharmonic partials, 5 ms attack, 250 ms exponential release, longer decay for lower notes. Spec with a fake `AudioContext`. Sample loading, the 1.5 s queued-press cap, and the load-failure notice do not apply until samples exist (task 9.1).
- [x] 3.5 Add the `usePianoSound` hook: creates and resumes the context from the first user gesture, applies the current sound and volume at each press, exposes `press(midi)` / `release(midi)` and the set of sounding notes (so the keyboard and the score can light keys), and disposes on unmount.
  - Note: the hook shares one engine across consumers (so the keyboard and score taps light each other's keys) and disposes its context when the last consumer unmounts, rather than per-hook.

## 4. Key gestures

- [x] 4.1 Add the `piano-key-gestures` model (design Decision 3): key under a pointer with black-key precedence, down / move / up / cancel handling, glissando across keys, 10-voice cap releasing the oldest, and scroll-vs-play arbitration. Spec with synthetic pointer sequences for every scenario in `piano-pitch-check` (hold, two keys, slide, scroll).

## 5. Overlay component

- [x] 5.1 Build `PianoOverlay` (web view): the strip of keys with pressed states, octave labels, momentum scroll with a position strip, the handle with the three snap heights and collapse, the volume control, and a close control. Nocturne tokens only, 44 pt controls, sentence-case copy, and accessible labels on the handle and volume. Keep the view thin over the specced models.
- [ ] 5.2 Mount the overlay in the shell above the mini-player and tab bar (`mobile-shell`), shrinking the content area above it, and hide it while the viewer is open. Confirm the playback sheet and waveform are not moved.
- [ ] 5.3 Add the piano control to the playback screen transport area and the mini-player, with the keyboard icon added to the shared icon map and its spec, and the open/closed accessibility labels. Hide the controls when `pianoCapabilities().canPlay` is false.

## 6. Settings and viewer integration

- [x] 6.1 Add the `Piano` section to Settings (`Sound`, `Show every note name`, `Black key names`) through the existing preference-row model, extending `screens/settings/model.spec.ts`.
- [x] 6.2 Add the piano toggle to the sheet music viewer toolbar and compact-layout rail, mount the docked instance under the score bound to the shared store, and shrink the score area to the space above it. Open collapsed in the compact-height layout. Extend the viewer layout model spec.
  - Note: the compact-height rule (opens collapsed) lives in the shared toggle model (`getPianoToggleModel`, specced in `piano-toggle.spec.ts`) rather than in `layout-model.ts`, because the toggle is what decides how the piano opens; the viewer passes `openCollapsed` from `isCompactViewerHeight`. The toolbar's controls now wrap on a narrow phone so Fit, Go to, the piano toggle, and play all stay reachable.
- [x] 6.3 Centre the keyboard on the shown part's range when opened from the viewer (using the part's lowest and highest pitch from the loaded score), once per opening and not during user scrolling. Spec the range-to-offset function.

## 7. Tapping notes in the score

- [ ] 7.1 Implement `scoreNoteAtPoint` on the OSMD renderer using the approach recorded in 1.3, returning the sounding MIDI number, with tests for sounding pitch under `<transpose>`, ties, and rests (pure pitch part specced; the DOM part verified in the browser).
- [ ] 7.2 Wire pointer down / up in the web surface to `usePianoSound`, with a 350 ms minimum audible duration, a notehead highlight while sounding, and the key pressed state when the overlay is open. PDF surfaces stay inert.

## 8. Verification and docs

- [ ] 8.1 Verify in the browser preview with the track muted: open from the mini-player, playback screen, and viewer; hold and multi-touch keys; slide; scroll; resize and collapse; persist across reload; organ and piano sounds; tap notes in a MusicXML and a MIDI source and a PDF; the piano staying out of the way of transport and score. Record the result here.
- [x] 8.2 Add the native piano sound item to `native-playback-follow-ups` (bundled-sample native audio, spike to choose a dependency, device check).
- [x] 8.3 Update the README with the new capability and run `npm exec -- nx run-many -t lint test typecheck build --all` (or affected) green.

## 9. Future work

- [ ] 9.1 Replace the synthesized `Piano` with recorded samples. Find a set whose licence allows bundling (CC0 or equivalent; CC-BY with attribution in Settings would also work if the user agrees), about one sample every minor third from C2 to C7 compressed to ≤ 1.5 MB, loaded lazily on first press behind `PianoVoice`. Restore the first-press queue (1.5 s cap), the load-failure fallback to the organ with a quiet notice, and their specs. Confirm the licence choice with the user first.
