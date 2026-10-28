## Context

The piano (`library/piano/`) is a non-modal overlay docked above the mini-player; its model and key state live in `piano-overlay-model.ts` and `piano-host-store.ts`. Scores render through OpenSheetMusicDisplay, and `score-note-tags.ts` already tags each drawn notehead with `data-midi` (sounding pitch, transposition applied); MIDI scores reach the same renderer through `midi-notation`. Playback is `react-native-track-player`, which owns the native audio session (see `docs/mobile-cross-platform-audio-playback.md`). The app has no microphone code: no capture dependency and no permission strings.

Constraints from the user: reuse maintained solutions where possible, and no copyleft code.

## Goals / Non-Goals

**Goals:**

- One detection pipeline feeding three surfaces (monitor and Pitch view, piano, score) through one store.
- Pure, testable detection logic that does not depend on React Native or Web Audio.
- A permissive-only dependency set, including model weights if a neural model is ever added.

**Non-Goals:**

- Grading, recording, polyphony, echo cancellation, PDF notes, automatic score follow.

## Evaluation of backends

Licenses were read from npm metadata and the repositories' LICENSE files. Weights licenses are called out separately because they often differ from the code.

### Estimators

| Option                     | Kind                                       | License                                                                                                     | Notes                                                                                                                                                                                                                                         | Verdict                        |
| -------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **pitchy** 4.1.0           | McLeod, pure JS, depends on `fft.js` (MIT) | MIT in the installed 4.1.0 `LICENSE` file and npm metadata (checked in task 1.3; `fft.js` 4.0.4 is MIT too) | Takes a `Float32Array` and a sample rate, returns pitch and clarity. Last published Jan 2024, small and finished rather than abandoned. Its README's licence section is a copy-paste from another project; the LICENSE file is the authority. | **Chosen**                     |
| pitchfinder 2.3.4          | YIN, AMDF, McLeod and others               | npm says `GNU v3`; no LICENSE file on GitHub (404 on both branches)                                         | Recently published, but a copyleft or undeclared licence.                                                                                                                                                                                     | Rejected                       |
| essentia.js 0.1.3          | WASM                                       | AGPL-3.0                                                                                                    | Copyleft, last published 2022.                                                                                                                                                                                                                | Rejected                       |
| aubiojs 0.2.1              | WASM                                       | not shown                                                                                                   | Last published 2022.                                                                                                                                                                                                                          | Not pursued                    |
| @spotify/basic-pitch 1.0.1 | Neural, polyphonic, offline                | Apache-2.0 code; the bundled model files carry no licence file of their own                                 | Needs an `AudioBuffer`, not a streaming estimator. README contains an unexplained "Apache or GPL" sentence.                                                                                                                                   | Not suitable for live tracking |
| CREPE (marl)               | Neural                                     | MIT code; weights licence not stated                                                                        | Python and Keras only; no JS port found.                                                                                                                                                                                                      | Later, if needed               |
| FCPE (CNChTu)              | Neural                                     | MIT code; weights licence not stated                                                                        | PyTorch only.                                                                                                                                                                                                                                 | Later, if needed               |
| RMVPE (Dream-High)         | Neural                                     | Apache-2.0 code; weights licence not stated                                                                 | PyTorch only.                                                                                                                                                                                                                                 | Later, if needed               |
| sonovice/pitch-detector    | SolidJS demo app, TF.js                    | MIT                                                                                                         | 8 stars, no releases, not published as a library, model unnamed. Useful as a UI reference only.                                                                                                                                               | Reference only                 |

A neural estimator would need a JS runtime (`onnxruntime-web` and `onnxruntime-react-native` are both MIT) and a converted model whose weights licence we have verified. None of the three singing-voice models ships a JS port, so a neural path is a later swap behind the interface, not part of this change.

### Native microphone capture

Research for `native-playback-follow-ups`; not built in this change (Decision 10).

| Option                                               | Licence                                                                                                   | Notes                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **react-native-audio-api** 0.13.x (Software Mansion) | MIT. WebKit-derived BSD code. FFmpeg (LGPL) is linked **only** when `enableFFmpeg: true`; off by default. | `AudioRecorder.onAudioReady` delivers float buffers in -1..1 to JS. Needs a dev build (not Expo Go) and `iosMicrophonePermission` plus `android.permission.RECORD_AUDIO` in its Expo plugin. Exposes the Web Audio API shape on native, which would let one capture path serve web and native. Very active (published the day this was checked). |
| **@siteed/audio-studio** 3.2.x                       | MIT (per README and npm)                                                                                  | `startRecording({ streamFormat: 'float32', onAudioStream })` gives `Float32Array`. Expo-oriented. Not verified: dev build and config plugin requirements, web streaming, and third-party notices. Its sibling packages (essentia, sherpa-onnx) are separate and unchecked.                                                                       |

Both are permissive in the configuration we would use. The unverified part is behaviour, not licence: whether either keeps capturing while `react-native-track-player` plays, and what that does to the audio session and lock-screen controls. That is the first native spike, which Decision 10 defers.

## Decisions

### Decision 1: A narrow estimator interface, pitchy behind it

`PitchEstimator.estimate(frame: Float32Array, sampleRate: number): { frequencyHz: number; clarity: number } | null`. The pitchy-backed implementation lives in the framework-agnostic package. Everything above the interface (gate, smoother, segmenter, note math) is ours and unit-tested with synthetic sine and voice-like fixtures. Replacing the estimator later touches one file.

Alternative considered: write McLeod or YIN ourselves to drop the dependency. Held in reserve; the interface makes it a one-file swap if pitchy proves inadequate or its licence ambiguity matters.

### Decision 2: Detection stages

```
PCM frames ─► level gate ─► estimator ─► clarity gate ─► median smoothing ─► note segmenter ─► PitchStore
(mono, 44.1/48k   (RMS below   (freq,      (clarity <        (~5 frames)        (stable ≥ ~80 ms       { midi, cents,
 or 16k, ~2048)    threshold →   clarity)    threshold → none)                    becomes a note;        hz, clarity,
                   none)                                                          gaps hold briefly)     active }
```

Level and clarity thresholds sit behind one user-facing `Sensitivity` setting (low, normal, high). Frame size and hop are constants chosen in the spike; the aim is under 100 ms from sound to display. The store publishes an `active` flag and holds the last note for a short grace period so the display does not flicker between syllables.

### Decision 3: One store, three consumers

`PitchStore` holds `{ listening, permission, status, current, history }` and is the only thing the surfaces read. The monitor, the Pitch view, the piano keys, and the score marker are subscribers; none talks to the microphone. Listening is on only while at least one consumer is mounted and the user has turned it on, and it stops whenever the app is not visible (app switch, screen lock, hidden web tab), even while a track plays. The surfaces are all visual, so detecting with no one looking only costs battery and trust, and background microphone use would need an Android foreground service of type `microphone` and the iOS background-audio mode. The user's `Listen` choice is kept, so listening resumes by itself, without a new prompt, when the app is visible again. "Visible" rather than "focused" is used where the platform offers it, so a monitor beside another app in split view keeps working.

### Decision 4: Matching rules live in the models package

`matchSungNote({ sungMidi, sungCents, targetMidi, toleranceCents })` returns `'exact' | 'other-octave' | null`, with tolerance ±50 cents (the nearest semitone). `other-octave` means the same pitch class in a different octave. Octave differences come from two places: the singer's voice (a baritone on a tenor line), which only the singer knows, and how the score was encoded, where a plain-treble tenor part has no machine-readable octave. A per-part offset stored on the score cannot capture the first, so it is not part of this change. Instead the score draws exact matches with a strong mark and, only when the device setting `Show other-octave matches` is on (default off), other-octave matches with a softer mark. The piano and the Pitch views always use the real octave, since they answer "which note is that?". The setting is only meaningful with a score, so it is offered only as a row of the `Practice tools` menu while the sheet music viewer is open, and nowhere else. A per-singer octave shift (down one, none, up one) that promotes soft marks to strong is a possible later addition once real use shows it is needed. Reference tuning defaults to A4 = 440 Hz with a setting.

### Decision 5: Piano and score are passive marks

The piano adds a `detected` key state, drawn differently from `pressed`, for keys in view only, and an edge arrow when the sung key is scrolled off. The score walks the rendered noteheads that carry `data-midi` and toggles a marker attribute on matches, limited to the notes currently in the viewport (the existing hit-test and staff-band helpers know what is drawn). Both are throttled to the display frame rate and never trigger playback or navigation.

### Decision 6: A compact monitor and a full-screen Pitch view

Two forms share one pure model. The monitor is a 64 pt strip (note, cents gauge, a few seconds of history) docked above the piano, or above the mini-player and tab bar, so it never covers the transport or the score. The full `Pitch` view is a full-screen study view opened from the monitor's expand control: a pitch-progression roll, a focus panel, and a readout bar (Decision 15). Turning on `Pitch detection` from any `Practice tools` menu opens the monitor; the full view is opened from there. The monitor's on or off state is remembered per device. An earlier draft had a third, taller dock size; it is dropped, because the roll and the focus panel need a screen, and a half-size version served neither the playback nor the study use.

### Decision 7: Privacy and permission

The permission request is made on the first press of `Listen`, never at launch, with a short explanation first. Denial leaves a persistent, non-blocking message with a link to settings. No audio is persisted or transmitted; the spec states this and a task adds a test that nothing in the pipeline writes samples to storage or the network layer.

### Decision 8: A new `@org/pitch-detection` package

The estimator interface, the pitchy-backed estimator, the gates, the smoother, and the note segmenter live in a new package, `@org/pitch-detection`, which depends on `@org/audio-library-models` and has pitchy (and its `fft.js`) as its only third-party dependency. It takes `Float32Array` frames and a sample rate and returns notes: no React, no Web Audio, no storage. Note math (frequency to MIDI and cents, reference tuning, `matchSungNote`) stays in `audio-library-models`, because the piano, the score, and the tool all need it and `midiToNoteName` already lives there. The microphone sources (`PcmSource`, a web implementation and a native file that reports listening as unavailable) stay in the app, since they are per-platform and tied to the capture library.

```
audio-library-models        note math, matchSungNote
        ▲
@org/pitch-detection        estimator interface, pitchy estimator, gates, smoother, segmenter
        ▲
mobile-rehearsal-player     PcmSource, PitchStore, monitor, Pitch view, piano state, score matcher
```

Alternatives considered: a folder in `audio-library-runtime` (rejected: that package is persistence and depends on AsyncStorage, which every importer of the pitch code would inherit) and putting everything in `audio-library-models` (rejected: it holds domain types, not a signal-processing dependency). `midi-notation` is the precedent: one focused capability, one third-party dependency, depending on models. Unlike `midi-notation`, this package is small enough to import statically; the lazy-loading rule in CLAUDE.md does not apply to it.

### Decision 9: The score follows the track's pitch offset

Speed never changes pitch (playback-shaping preserves it at every speed), so a time-stretched track needs nothing. A pitch-shifted track does: a singer who transposes the track down two semitones and sings along sings every note two semitones below the written one, and a score fixed to the written pitch would never mark anything. The score matcher therefore takes the active pitch offset of the playing item and matches the sung note against the written pitch plus that offset.

```
written A4 ──(track shifted −2 st)──► singer hears and sings G4
score as written:  G4 ≠ A4 → no mark
score follows:     G4 = A4 − 2 → A4 notes marked
```

The offset comes from the playing item: a session adjustment, or the stored transform of an adjusted track or loop. Shifts are whole semitones, so cents are unaffected. With no offset, or with nothing playing, behaviour is unchanged. Pitch shifting is inert on native iOS and Android today, so the offset is zero there; the rule applies automatically if native pitch lands. While the offset is non-zero the score shows it (for example `Following track pitch −2 st`) so the marks never look wrong to someone who forgot the shift. There is no separate switch: setting the offset back to zero is the way to match the written key. The piano and the tool report the real sung pitch and ignore the offset.

### Decision 10: Web first; native is deferred to `native-playback-follow-ups`

The piano and the sheet music viewer shipped web-first, with native work tracked in `native-playback-follow-ups` (1.6 native sheet music, 1.7 native piano, 1.2 native semitone pitch). Pitch detection follows the same path. This change builds and verifies the web implementation only: `getUserMedia` capture feeding the shared pipeline. A `pitchCapabilities()` gate (modelled on `pianoCapabilities()`) reports `canListen` false on native, so the Pitch view, the monitor, and the detected states are absent there rather than broken. The detected piano key and the score marks would not appear on native anyway until its piano (1.7) and sheet music viewer (1.6) exist. The native capture research above, the audio-session and background questions, and the microphone permission configuration move to that change through task 7.1, which must be done before this change is archived.

### Decision 11: One `Practice tools` control and menu replace the piano buttons

The piano is currently opened from three places: the shell tab bar (`Piano` item, `getPianoTabPresentation`), the playback screen header, and the sheet music viewer toolbar and compact rail, all through `usePianoToggle`. With two tools, three surfaces would carry two buttons each, so all three get one `Practice tools` control that opens one shared floating menu with a toggle row per tool. The menu model derives its rows from the capability checks (`pianoCapabilities().canPlay`, `pitchCapabilities().canListen`), so a platform sees only what it can do and the control disappears when it has nothing to offer (native, for now). Context decides one more row: `Show other-octave matches` is listed only while the sheet music viewer is open, because it changes the score marks and means nothing elsewhere. Rows toggle without closing the menu so both tools can be turned on in one visit; the menu dismisses on a press outside or Escape. The floating presentation reuses the app's existing popover pattern (the Drive session menu and the library search filter popover) rather than a new primitive. The control shows its active state while any tool is on. Further tools are added as rows, which is the intended home for features such as recording.

### Decision 12: `PcmSource` is built so a recorder can reuse it

A rehearsal recording feature is planned as its own change (`rehearsal-recording`), explored after this one. It would capture from the same microphone path, so `PcmSource` is shaped for more than one consumer even though only pitch detection uses it here:

- **Fan-out:** the source can have several subscribers at once and owns the single microphone stream, starting when the first subscribes and stopping after the last leaves. Pitch detection and a recorder must not each open the microphone.
- **Timestamped frames:** each frame carries a capture time on a clock shared with playback where the platform allows it (the audio context time on web), so a later recorder can align a take to track time. Pitch detection ignores the timestamp.
- **Unprocessed audio:** capture keeps echo cancellation, noise suppression, and auto gain off on web, which suits both pitch work and a faithful recording.
- **Nothing stored here:** the pitch pipeline keeps and writes no samples; the "nothing is stored" requirement belongs to pitch detection. Storing audio is an explicit, separate feature with its own consent and storage rules, owned by the recording change.

Recording would appear as a third row in the `Practice tools` menu (Decision 11). Nothing in this change builds it.

### Decision 13: Assume headphones

Both the playing track and the piano are audio the singer sings against, and on speakers both reach the microphone; a clean piano tone is easier to lock onto than a voice, so the pressed key would simply light as "detected". Filtering them out is echo cancellation, which is out of scope and unreliable. The decision is to assume headphones: the first time listening starts, one dismissible note says so, and nothing else changes. Detection is not paused while the track plays or a key sounds. Browsers do not reliably say whether headphones are connected, so there is no automatic detection.

### Decision 14: Marks are drawn by one style rule, and the offset is read from the shaping session

Explored in the code: every drawn notehead already carries `data-midi` (`score-note-tags.ts`; the attribute survives the strip renderer copying a run's SVG), so the score does not need to walk noteheads on each change. The matcher writes a single style rule (or one attribute on the score container) keyed on `[data-midi="N"]`, with a second rule for the other-octave pitches when that setting is on. The browser then marks exactly the notes that are drawn, which is "in view" by construction, with a constant number of DOM writes per sung-note change. The pitch offset is read from `PlaybackShapingSession.getState().effective.pitchSemitones` (the item's own transform, else the ambient setting), with `canShapePitch` telling when it is zero by necessity, and the matcher subscribes to the session. Still to confirm in task 5.2: that the rule reaches the strip renderer's copied slots (same document and no shadow root), and that marking keeps up with note changes on a long score.

### Decision 15: The full Pitch view, zones, and the focus panel

Layout, portrait: a header (close, title, settings), a large readout with the zone in text, the focus panel, the pitch roll, and a readout bar (pitch, confidence, listen toggle, state). In landscape the roll takes the width and the focus panel sits beside it, as in a desktop piano-roll tuner.

- **Zones:** a pure `centsZone(cents)` returns `precise` (≤10), `near` (≤25), `quarter-tone-off` (≤50), or `off-pitch` (beyond, only reachable against a held target). It lives in `audio-library-models` next to `matchSungNote`, and the strip, the roll bars, and the focus panel all use it, so colour and wording always agree. The zone is always also text.
- **Roll:** note segments from the segmenter, drawn on a vertical scale that auto-centres on the sung range with octave rows emphasised. Bars carry the zone colour and the note name when long enough. Time zoom runs about 5 to 60 seconds.
- **Focus panel:** cents (±50) against time for the target, with the three bands drawn and labelled, the trace, and a dot for the present. Default target is the nearest note; tapping a note on the roll's scale, or the target chip, holds it. A held target can be further than ±50 cents away; the trace then clamps to the panel edge with a direction marker.
- **History:** kept in memory by the store (note segments plus a cents trace at the frame rate, capped to the largest zoom window) and dropped when listening stops. Nothing is persisted, consistent with the privacy decision.
- **Settings in the view:** sensitivity, from a settings sheet in the header (not in the Practice tools menu). A reference-tuning setting (A4 between 415 and 466 Hz) was built and then dropped as not useful to choir members, who rarely sing against anything tuned away from 440 Hz; notes are measured against a fixed A4 = 440 Hz. The note math, the pipeline and `PitchStore` still take a reference frequency, so a setting can return without reworking them.
- **Approved mock:** `design-source/pitch-mock.html` was reviewed and approved by the user. It fixes the Practice tools control and menu (two rows, plus `Show other-octave matches` only in the sheet music viewer), the monitor strip above the piano, the full-screen Pitch view in portrait and landscape (roll, focus panel, readout bar, settings sheet), the piano detected state, the score marks, and the layouts with lyrics, piano, and sheet music. UI tasks (4.1 onward) build to that mock.
- **Open question (not blocking):** whether the view should offer a pause or freeze of the display so a take can be studied after singing it. The approved mock does not include it, and it is not specified; revisit after the view is built.

## Risks / Trade-offs

- **Speaker bleed into the mic**: without headphones the detector hears the playing track and the piano, and a clean piano tone can win over the voice. Decided: assume headphones (Decision 13); no filtering, no echo cancellation.
- **Audio session conflicts on native**: simultaneous playback and capture may interrupt track-player or change routing (iOS category, Android focus). Mitigation: spike first, in `native-playback-follow-ups`; the monitor may be limited to platforms where it works.
- **Voice accuracy**: autocorrelation methods can octave-jump on breathy or low voices. Mitigation: the median smoother, clarity gate, and a spike on real choir recordings; the interface allows a neural swap.
- **Licence surface**: pitchy's README and LICENSE disagree with npm metadata (all permissive, but worth a clean attribution). Mitigation: record the licences in the README and add a CI licence allowlist check (separate small change).
- **Web differences**: browsers apply echo cancellation and noise suppression by default to `getUserMedia`; these must be disabled for pitch work or notes will be mangled.

## Open Questions

None remain for the web scope. Deferred to `native-playback-follow-ups` (task 7.1): which native capture library, `react-native-audio-api` or `@siteed/audio-studio`, decided by a device spike (session coexistence with `react-native-track-player`, buffer size, latency, Expo config plugin behaviour).
