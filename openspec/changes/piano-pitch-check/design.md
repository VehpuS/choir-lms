## Context

Playback runs through `react-native-track-player`; on web it is patched, and playback shaping already owns a Web Audio graph (a SoundTouch worklet) for the track. The sheet music viewer (`library/sheet-music/viewer/`) is a full-screen React Native `Modal`, so anything rendered by the app shell is hidden beneath it. Web renders MusicXML (and MIDI converted to MusicXML by `@org/midi-notation`) with OpenSheetMusicDisplay; PDF pages are images. The shell mounts the mini-player dock and tab bar (`routing/shell/mobile-shell/`). Device-level preferences (for example lyrics text size) are small stores with their own storage key and a model spec. Settings (`screens/settings/`) has preference rows driven by a model.

Users decided: a voice-range scrollable keyboard, web first with a second simple oscillator sound selectable in Settings, concert pitch always, entry points on the playback screen, the mini-player, and the sheet music viewer toolbar, a mix-on-top volume, hold-to-sustain multi-touch keys, and a bottom-docked resizable overlay. Tapping a note in sheet music plays it for MusicXML and MIDI.

## Goals / Non-Goals

**Goals:**

- A keyboard that opens in one tap from anywhere playback is available and never gets in the way of the transport or the score.
- A singer can hold a key and sing against it, with several keys at once, while the track plays.
- Tapping a notehead plays its sounding pitch and shows it on the keyboard.
- Pitch maths, key layout, and gesture handling are framework-agnostic models with specs; only the audio voices and the overlay view are platform code.

**Non-Goals:**

- Native sound, shaping-aware pitch, transposition, computer-keyboard mapping, a pinch gesture for key width (a slider sets it, Decision 9), recording, MIDI input, tuning options, chord or scale helpers.
- Playing the score back from the notes (this plays one tapped note only).

## Decisions

### Decision 1: The overlay is a non-modal dock with one shared state store

`PianoOverlay` is a non-modal panel docked directly above the mini-player and tab bar (bottom of the screen when neither shows). It does not trap touches outside itself, so the waveform, transport, and score stay usable. A module-level store (same pattern as the lyrics text-size store) holds `isOpen`, `heightStep`, and `scrollLeft`, persisted per device. The shell mounts one overlay. The sheet music viewer mounts a second instance, docked under the score, bound to the same store; while the viewer is open the shell's instance is hidden. Closing the piano in either place closes it in both, so opening it on the playback screen and then opening a score shows it already open in the viewer.

Alternative considered: a single global overlay rendered above everything. A React Native `Modal` always paints above the shell, so a single instance would need to be a modal itself, which blocks the score and transport.

### Decision 2: Size and layout

The keyboard has 52 white keys (A0–C8). White key width defaults to 40 pt and is user-adjustable up to 100 pt (Decision 9); at the default, a 44 pt touch target is met by the full key height and the gaps between black keys); the strip scrolls horizontally with momentum and a visible position strip. Height has three steps — compact (white 96 pt), regular (136 pt), tall (184 pt) — chosen by dragging the overlay's top handle, which snaps to a step. There is no collapsed state: closing and reopening from the tab bar restores the same height and scroll position, so a handle-only mode added nothing (removed 2026-10-20). On open with no stored scroll position the keyboard centres on middle C. When a sheet music viewer is showing a part, it centres on the middle of that part's range (task 6.3), once per opening, never while the user is scrolling.

Key labels: only C keys show an octave label (`C4`) by default; the Settings row `Show every note name` shows all natural keys, and black keys in the chosen spelling.

### Decision 9: Key width is a slider in the overlay (added 2026-10-21)

A user who wants bigger targets can widen the white keys from the 40 pt default up to 100 pt (about 2.5x), with black keys staying at 60 % of the white width as today. A `Key width` slider sits in the overlay header beside the volume control, with a 44 pt touch target, an accessible label, and the current width as its value text. The width is a device preference (`choirlms.piano.keyWidth`, clamped to 40–100 pt at the read boundary, default 40) and is not part of the height step, so resizing the height does not change it. The keyboard layout model already takes the white key width as an input; changing it recomputes key offsets, the strip's total width, the scroll clamp, and the position strip (minimap). While the slider is dragged the keyboard keeps the key that was at the centre of the view at the centre (the scroll offset is rescaled around it), so the user does not lose their place. With wider keys fewer keys are in view: the strip scrolls as before, and a part's range from the viewer opening (Decision 2) is centred, not fitted, when it no longer fits. Key labels do not grow with the key. The slider is for the piano only; Settings does not repeat it. Not a pinch gesture: pinch conflicts with the page's own zoom and scroll on touch and is not accessible.

### Decision 3: Gestures are a pure model over pointer events

A `piano-key-gestures` model maps pointer ids to the key under them (with black keys taking precedence in their region) and emits `press(midi)` and `release(midi)` for pointers going down, moving to another key, going up, and being cancelled. Moving a held pointer onto a neighbouring key releases the old key and presses the new one (glissando). Scroll vs play: a drag that begins on the scroll strip beneath the keys scrolls; a touch that begins on a key plays and never scrolls. Polyphony is capped at 10 voices; the oldest voice is released first. The model has no React or audio imports so it is specced with synthetic event sequences.

### Decision 4: One voice interface, two web implementations

`PianoVoice` is `{ load(): Promise<void>; noteOn(midi, velocity): NoteHandle; setVolume(v): void; dispose(): void }` with `NoteHandle.release()`. The web implementations use their own `AudioContext`, separate from the playback shaping graph, so the piano is mixed by the output device on top of the track and never touches the track's gain.

- `Piano` (default): sampled. One sample every minor third from C2 to C7 (about 21 samples) as short decaying clips, played at `playbackRate` for the nearest sample; notes held longer than the clip loop the tail with a slow fade; release is a 250 ms exponential fade. Samples are lazy-loaded the first time a key is pressed and cached for the session; the overlay shows keys immediately and the first press waits for the load (press is queued and played on arrival, but not later than 1.5 s). Size budget is 1.5 MB total; the licence is verified in the spike (task 1.1) and recorded in the repo. If no acceptable sample set exists, the fallback is an additive-synthesis piano (decaying partial stack) behind the same interface.

  Outcome (task 1.1, 2026-10-19): no sample set with a verified redistributable licence was found, so `Piano` ships as the additive-synthesis voice. The sample loading, queued first press, and load-failure fallback above are deferred to task 9.1 and apply once samples are chosen.

- `Organ`: a fixed-envelope oscillator stack (sine fundamental plus two quiet harmonics), 20 ms attack, sustaining while held, 120 ms release. No assets.

The selected sound is stored by the preferences store and read when a voice is created; changing it in Settings takes effect on the next press. Pitch is `440 * 2^((midi - 69) / 12)`; no shaping offset is applied (Decision 6).

### Decision 5: Platform availability is a capability flag

`pianoCapabilities()` returns `{ canPlay: true }` on web when `AudioContext` exists and `{ canPlay: false }` on native and on browsers without it. When `canPlay` is false the piano control is not rendered on the playback screen, mini-player, or viewer toolbar, and note tapping is off. This mirrors how shaping reports `canShapePitch`. Native sound goes to `native-playback-follow-ups` (a bundled-sample native audio dependency to be chosen after a spike).

### Decision 6: Concert pitch only

Keys sound absolute pitches and never follow `PlaybackShaping.pitchSemitones`. A singer reading written notes wants written pitch, and the shaped audio is a separate setting they are already looking at on the same screen. Tapped notes in MusicXML use sounding pitch: written pitch plus the part's `<transpose>` (`chromatic` and `octave-change`) when present; vocal parts normally have none.

### Decision 7: Tapping notes in the score

The OSMD renderer already holds each notehead's graphical object and its source note. A `scoreNoteAtPoint(point)` helper on the renderer hit-tests noteheads (with a 12 px slop) and returns the sounding MIDI number, the voice, and the bounding box. The surface calls `piano.sound(midi)` on pointer down and releases on pointer up (minimum audible 350 ms for quick taps), highlights the notehead in the Nocturne accent while sounding, and lights the matching key if the overlay is open. A tap on a rest, a tie continuation, or empty staff does nothing. Tapping works whether or not the overlay is open and uses the current sound and volume. Hit-testing (spike 1.3): after each render the renderer tags every notehead element with its sounding pitch (`data-midi`), using `GraphicSheet.MeasureList` and each graphical note's `getNoteheadSVGs()`, and a tap picks the nearest tagged notehead by `getBoundingClientRect`. The tag survives the strip renderer cloning a run's SVG into its slot and needs no zoom maths. MIDI sources need nothing extra: the viewer already turns them into MusicXML before rendering. Because the surface is SVG on web, there is no accessibility mapping in this change.

### Decision 8: Preferences and settings

A `piano-preferences` store holds `sound: 'piano' | 'organ'`, `volume` (0–1, default 0.7), `accidentals: 'sharps' | 'flats'` (default sharps, used for black-key labels and the note readout), `showAllNoteNames`, `keyWidth` (40–100 pt, default 40; Decision 9), and the overlay state from Decision 1, under `choirlms.piano.*` keys. Parsing and clamping happen where the value is read from storage (unknown sound falls back to `piano`; volume clamps to 0–1). Settings gets a `Piano` section with `Sound`, `Show every note name`, and `Black key names` rows driven by the existing preference-row model. Volume lives in the overlay itself.

## Risks / Trade-offs

- [Sample licensing and size] → spike first, hard 1.5 MB budget, synthesis fallback behind the same interface.
- [First press latency while samples load] → queue with a 1.5 s cap, prefetch on first overlay open, and show a quiet loading dot on the volume control.
- [Browser autoplay rules block the audio context until a gesture] → create and resume the context in the first key press handler and on overlay open (a user gesture).
- [OSMD hit-testing precision at small zoom] → 12 px slop and nearest-notehead resolution; verified at the viewer's zoom steps.
- [Overlay height competes with the score on a phone held sideways] → the compact step; the viewer's compact-height layout (height under its existing threshold) caps the piano at the compact step for that screen, without changing the stored height, and the user can close it.
- [Mixing on top can be inaudible over loud audio] → accepted; the user chose no ducking, the volume slider is the control.

- [A wide keyboard hides the part's range] → the slider is user-driven; the viewer still centres on the range, and the position strip shows where the view sits.
- [The header gets crowded with volume, key width, and close on a 320 pt phone] → verify the layout at 320 pt in the browser; if both sliders do not fit, the key width slider takes a second row under the header rather than shrinking either target.

## Migration Plan

No data migration. Preferences are new keys with defaults. Rolling back removes the overlay and keys; nothing else reads them.

## Open Questions

None. Decisions above were confirmed with the user on 2026-10-18 (range, concert pitch, web first with an organ option in Settings, entry points, mix-on-top, hold-to-sustain with multi-touch, resizable bottom dock, MusicXML and MIDI note tapping).
