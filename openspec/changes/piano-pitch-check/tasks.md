## 1. Spikes

- [ ] 1.1 Piano samples: find a sample set whose licence allows bundling and redistribution (CC0 or equivalent), about one sample every minor third from C2 to C7, compress to ≤ 1.5 MB total (for example OGG/AAC), and record the source and licence in the repo. If none fits, build the additive-synthesis fallback behind the same `PianoVoice` interface (design Decision 4). Record the outcome here.
- [ ] 1.2 Web Audio check: confirm in the browser preview that a separate `AudioContext` plays over the playing track without affecting the shaping graph, that `resume()` works from the first key press, and the first-press latency with the samples cold and warm. Record the numbers here.
- [ ] 1.3 OSMD hit-testing: confirm how to map a pointer position to a notehead and its pitch (via `GraphicSheet` or the SVG note groups) at each viewer zoom step, including a MIDI-converted score and a part with `<transpose>`. Record the chosen approach in design Decision 7.

## 2. Pitch model

- [ ] 2.1 Add framework-agnostic pitch helpers to `packages/audio-library-models`: MIDI number ↔ note name with octave (sharp and flat spelling), MIDI → frequency (A4 = 440), and MusicXML pitch (`step`, `alter`, `octave`, optional `<transpose>` `chromatic` / `octave-change`) → sounding MIDI number. Spec the helpers, including A0, C8, C4 = 60, accidentals, and a transposed part. Export through the package index.
- [ ] 2.2 Add a keyboard layout model in the app (`library/piano/`): the 88 keys with white/black classification, left offset and width, label for a key given `showAllNoteNames` and `accidentals`, and the scroll offset that centres a given MIDI number or range. Spec it, including no label other than C by default and the centring edge cases at both ends.

## 3. Preferences and voices

- [ ] 3.1 Add the `piano-preferences` store (`choirlms.piano.*`): `sound`, `volume`, `accidentals`, `showAllNoteNames`, and the overlay state (`isOpen`, `isCollapsed`, `heightStep`, `scrollLeft`), parsed and clamped at the read boundary (design Decision 8). Spec defaults, clamping, an unknown sound, and a storage failure falling back to defaults.
- [ ] 3.2 Add the `PianoVoice` interface and `pianoCapabilities()` (design Decisions 4 and 5) with the capability flag spec for web with and without `AudioContext` and for native.
- [ ] 3.3 Add the web `Organ` voice (oscillator stack, attack, sustain, release) with a spec against a fake `AudioContext` for attack, release, volume, and polyphony cap.
- [ ] 3.4 Add the web `Piano` voice: lazy sample load on first press, nearest-sample playback rate, held-note tail looping, 250 ms release, 1.5 s queued-press cap, and fallback to the organ tone with a notice on load failure. Spec with a fake `AudioContext` and `fetch`: cold press, warm press, load failure, nearest-sample selection across the range.
- [ ] 3.5 Add the `usePianoSound` hook: creates and resumes the context from the first user gesture, applies the current sound and volume at each press, exposes `press(midi)` / `release(midi)` and the set of sounding notes (so the keyboard and the score can light keys), and disposes on unmount.

## 4. Key gestures

- [ ] 4.1 Add the `piano-key-gestures` model (design Decision 3): key under a pointer with black-key precedence, down / move / up / cancel handling, glissando across keys, 10-voice cap releasing the oldest, and scroll-vs-play arbitration. Spec with synthetic pointer sequences for every scenario in `piano-pitch-check` (hold, two keys, slide, scroll).

## 5. Overlay component

- [ ] 5.1 Build `PianoOverlay` (web view): the strip of keys with pressed states, octave labels, momentum scroll with a position strip, the handle with the three snap heights and collapse, the volume control, and a close control. Nocturne tokens only, 44 pt controls, sentence-case copy, and accessible labels on the handle and volume. Keep the view thin over the specced models.
- [ ] 5.2 Mount the overlay in the shell above the mini-player and tab bar (`mobile-shell`), shrinking the content area above it, and hide it while the viewer is open. Confirm the playback sheet and waveform are not moved.
- [ ] 5.3 Add the piano control to the playback screen transport area and the mini-player, with the keyboard icon added to the shared icon map and its spec, and the open/closed accessibility labels. Hide the controls when `pianoCapabilities().canPlay` is false.

## 6. Settings and viewer integration

- [ ] 6.1 Add the `Piano` section to Settings (`Sound`, `Show every note name`, `Black key names`) through the existing preference-row model, extending `screens/settings/model.spec.ts`.
- [ ] 6.2 Add the piano toggle to the sheet music viewer toolbar and compact-layout rail, mount the docked instance under the score bound to the shared store, and shrink the score area to the space above it. Open collapsed in the compact-height layout. Extend the viewer layout model spec.
- [ ] 6.3 Centre the keyboard on the shown part's range when opened from the viewer (using the part's lowest and highest pitch from the loaded score), once per opening and not during user scrolling. Spec the range-to-offset function.

## 7. Tapping notes in the score

- [ ] 7.1 Implement `scoreNoteAtPoint` on the OSMD renderer using the approach recorded in 1.3, returning the sounding MIDI number, with tests for sounding pitch under `<transpose>`, ties, and rests (pure pitch part specced; the DOM part verified in the browser).
- [ ] 7.2 Wire pointer down / up in the web surface to `usePianoSound`, with a 350 ms minimum audible duration, a notehead highlight while sounding, and the key pressed state when the overlay is open. PDF surfaces stay inert.

## 8. Verification and docs

- [ ] 8.1 Verify in the browser preview with the track muted: open from the mini-player, playback screen, and viewer; hold and multi-touch keys; slide; scroll; resize and collapse; persist across reload; organ and piano sounds; tap notes in a MusicXML and a MIDI source and a PDF; the piano staying out of the way of transport and score. Record the result here.
- [ ] 8.2 Add the native piano sound item to `native-playback-follow-ups` (bundled-sample native audio, spike to choose a dependency, device check).
- [ ] 8.3 Update the README with the new capability and run `npm exec -- nx run-many -t lint test typecheck build --all` (or affected) green.
