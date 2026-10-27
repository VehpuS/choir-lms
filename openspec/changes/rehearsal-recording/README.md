# rehearsal-recording

Record rehearsal takes against a track: punch in and out based on playback, and optionally overlay a take on the original. Explored after `pitch-detection`; no proposal, design, specs, or tasks yet.

## Notes carried over from the first exploration (2026-10-27)

- **Builds on `pitch-detection`:** the shared `PcmSource` (one microphone stream, several subscribers, timestamped unprocessed frames; see that change's design Decision 12) and the `Practice tools` menu, where recording would be a third row.
- **Punch in and out:** a take must line up with the track to the sample. That needs a stored start offset in track time and a latency correction (microphone against speakers), possibly with a calibration step. Markers and loops already exist and are natural punch points (arm a take, punch in at a marker or loop start, out at the loop end).
- **Overlay on the original:** playing a take and the track together and keeping them in sync through play, pause, seek, and speed changes. On web the track plays through Shaka and a take would play through Web Audio, so two engines must agree; a balance control is needed.
- **Storage and ownership:** where takes live (IndexedDB through the offline `AudioStore` and its budget, Drive, or both), and a model for takes that belong to a track with a punch range, a name, and possibly several takes per section.
- **Shared mixing:** playing a take with the track, and exporting that overlay, is the same problem as playing stems together; see `composite-tracks`. Design the mixer once.
- **Privacy:** pitch detection stores no audio. Recording is an explicit, separate feature and needs its own consent and storage rules.
- **Native:** deferred like the rest, to `native-playback-follow-ups`, with the same audio-session and background questions.
- **Likely first slice:** a bare record-and-play-back take on web; punch points and overlay later.
