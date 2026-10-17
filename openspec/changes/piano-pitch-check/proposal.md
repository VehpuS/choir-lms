## Why

A singer learning a part checks pitches against an instrument: they read the notes, play one, and sing it. Today they leave the app (or reach for a real piano) to do that, and they cannot do it while the track is playing and the score is on screen. A built-in piano that opens over playback, and notes in the score that sound when tapped, close that gap.

## What Changes

- Add a piano overlay: a non-modal, bottom-docked keyboard that opens over any screen during playback (playing or paused) without stopping or covering the transport. It is resizable (key height), collapsible to a handle, and remembers its open state, height, and scroll position.
- The keyboard spans A0–C8 (88 keys) and scrolls horizontally. It opens on middle C, or on the range of the vocal part when sheet music is showing. C keys carry octave labels (`C4`); an option shows every note name. Keys are multi-touch and sound for as long as they are held, with a short release; sliding a finger across keys plays a glissando. The pitch is always concert pitch (it never follows the track's pitch shaping).
- Add two sounds, chosen in Settings: a sampled `Piano` (default) and a simple `Organ` oscillator tone. A device-level piano volume sits in the overlay. The piano mixes on top of the track and never pauses, ducks, or alters it.
- Make notes in rendered sheet music tappable: tapping a notehead in MusicXML or MIDI sheet music (both render through the same score path) plays that pitch and lights the matching key when the overlay is open. PDF is excluded because its notes cannot be identified.
- Open the piano from the playback screen, the mini-player, and the sheet music viewer toolbar. In the viewer the keyboard docks under the score and the score area shrinks so the staves stay visible.
- Scope: this change targets the web build (Web Audio), like playback shaping and sheet music. The piano control is hidden on native until native sound exists, tracked in `native-playback-follow-ups`.
- Out of scope: following the shaped pitch, a transpose control, computer-keyboard play mapping, pinch-to-zoom key width, recording, MIDI input, chords and scale tools, tuning other than A4 = 440 Hz, and any sound on native.

## Capabilities

### New Capabilities

- `piano-pitch-check`: the keyboard overlay (layout, range, sizing, labels, multi-touch, sounds, volume), how it mixes with playback, tapping notes in sheet music, and platform availability.

### Modified Capabilities

- `mobile-rehearsal-player-ui`: adds the piano entry points on the playback screen and mini-player, the overlay's placement relative to the mini-player, tab bar, and transport, and the Settings rows for piano sound and accidentals.

## Impact

- `packages/audio-library-models`: framework-agnostic pitch helpers (MIDI number ↔ note name ↔ frequency, sharp/flat spelling, MusicXML pitch with transposition → sounding MIDI number). `midi-notation` is lazily loaded and cannot be statically imported, so these live in the models package.
- `packages/mobile-rehearsal-player`: a piano module (keyboard layout model, key gesture model, overlay component, device preference store, voice interface with Web Audio `Piano` and `Organ` implementations), shell integration above the mini-player, viewer integration (toolbar toggle and docked instance), score note hit-testing in the OSMD renderer, and Settings rows.
- Assets: a small set of piano samples, lazy-loaded the first time a key is pressed (size budget in design). The licence must allow redistribution; chosen in a spike before it is added.
- No new native dependency. No change to playback, storage, or the library model; preferences are device-level.
- README gets a short note on the capability. `native-playback-follow-ups` gets a native piano sound item.
- Depends on `lyrics-lookup-and-saving` for the sheet music viewer; the viewer integration lands after that change is archived or on top of it.
