## Why

Singers rehearse against a recording, a score, and sometimes the piano, but the app cannot tell them what they are actually singing. The piano overlay already lets a singer hear a reference pitch; the missing half is hearing the singer back. A live pitch readout closes that loop: sing a note and see whether it is the one on the page, the key on the piano, or the one the recording is on.

## What Changes

- Add a live pitch detector that listens to the microphone and reports the sung note (name, octave, cents off, confidence), with silence and noise gated out and short wobbles smoothed into stable notes.
- Add a full-screen `Pitch` view, opened from the monitor, that shows the pitch progression (sung notes as bars on a labelled scale, coloured by accuracy, scrolling in time) and a focus panel on how close the singing is to a target note (precise, near, or a quarter tone off). It works with no track loaded.
- Add a compact `pitch monitor` strip that stays open during playback (docked, never covering the transport) so a singer can watch the notes they sing while the track plays, even when the piano and sheet music are closed.
- Piano: when the detected note matches a key in view, show it on that key (a distinct state from the pressed state). Keys out of view are not marked; an edge hint shows which side the sung note is on.
- Sheet music (MusicXML and MIDI scores): mark the notes in view whose sounding pitch matches the sung note. Exact matches get a strong mark; an opt-in setting, `Show other-octave matches` (off by default, offered only while the sheet music viewer is open because it means nothing elsewhere), adds a softer mark for the same note in another octave, because voices are often written at a different octave from where they sound.
- Practice tools menu: the `Piano` tab becomes a `Practice tools` tab that opens a floating menu with toggles for the piano and pitch detection. The same control and menu replace the piano buttons on the playback screen header and the sheet music viewer toolbar, so every surface that offered the piano now offers the menu. While the sheet music viewer is open the menu also lists the `Show other-octave matches` setting. The menu is built to take further tools as rows.
- Everything runs on the device. No audio is stored, uploaded, or sent anywhere.
- Platform scope: web is the build and verification target, like the piano and sheet music viewer before it. Native iOS and Android capture is deferred to `native-playback-follow-ups`; until then native shows no pitch controls. A final task hands the native work over to that change.
- Out of scope: scoring or grading a performance, recording or saving takes, polyphonic detection (several singers at once), echo cancellation of the playing track (headphones are assumed and the UI says so), automatic follow-along, and PDF scores (they have no note data).

## Capabilities

### New Capabilities

- `pitch-detection`: microphone permission and capture, the detection pipeline (estimator, gating, smoothing, note segmentation), the full Pitch view, the playback monitor, settings (other-octave matches, sensitivity), privacy, and failure states.

### Modified Capabilities

- `piano-pitch-check`: a detected-pitch state on keys in view, and the off-screen hint.
- `track-sheet-music`: matched-note marking in the MusicXML and MIDI viewers.
- `mobile-rehearsal-player-ui`: the `Piano` tab, playback header button, and viewer toolbar button become the `Practice tools` control and floating menu (renames and modifies the piano reachability requirement).

## Impact

- `packages/audio-library-models`: pure note math reused by every surface (frequency to MIDI and cents, tuning reference, exact versus other-octave match, match tolerance). `midiToNoteName` already lives here.
- New framework-agnostic package `@org/pitch-detection` (depends on `audio-library-models`; pitchy is its only third-party dependency): the `PitchEstimator` interface, the pitchy-backed estimator, the gate, the smoother, and the note segmenter. No React, no Web Audio.
- `packages/mobile-rehearsal-player`: a `library/pitch/` feature (store, hooks, monitor, full Pitch view), a `PcmSource` with a web implementation and a native file that reports listening as unavailable, the `Practice tools` menu and control (replacing the piano controls in the shell tab bar, the playback header, and the viewer toolbar), a piano key state, a score note matcher beside `score-note-tags` (which already tags noteheads with `data-midi`), and settings.
- One new runtime dependency, permissive: pitchy (with `fft.js`). Adding it touches the manifests and `package-lock.json` together. Native capture libraries, microphone permission strings, and any dev-build changes belong to `native-playback-follow-ups`.
- README gets a short note on the capability.
