## Context

`pitch-detection` added `PcmSource`: one shared microphone stream with several subscribers, unprocessed audio, and the `Practice tools` menu with a toggle row per tool. Its design (Decision 12) said a recorder could reuse it. Reading the code for this change shows two gaps:

- **Overlapping frames.** `PcmSource` delivers 2048-sample analysis frames at a 1024-sample hop (`pcm-frame-assembler.ts`). Consecutive frames share half their samples, so a recorder cannot concatenate them.
- **No shared clock.** `captureTimeSec` is the capture `AudioContext`'s `currentTime`, and that context belongs to the microphone path. The track plays through a media element (react-native-track-player on Shaka), whose `currentTime` is a different clock. The only other `AudioContext` is created by the pitch shifter, and only while pitch shaping is active. Decision 12's "clock shared with playback" is therefore not true yet.

Other facts that shape the design: playback on web is `window.rntp.getMediaElement()`; the SoundTouch worklet already routes that element through an `AudioContext` for pitch shifting; the offline `AudioStore` is an IndexedDB store with eviction and a budget meant for downloaded tracks; the `drive.file` scope and a Drive upload exist but are not used here.

## Goals / Non-Goals

**Goals:**

- Record a take while a track plays and store where in the track it started, accurate to a few milliseconds after compensation.
- Play a take with its track and keep them in sync through play, pause, seek, and loop wrap.
- Own a local store for takes that eviction of cached tracks can never touch.
- Put the sync and gain logic in one reusable, testable place.

**Non-Goals:**

- Punch ranges tied to markers and loops (a take starts and stops by hand).
- Exporting a mixed overlay; saving takes to Drive.
- Echo cancellation: headphones are assumed, as in pitch detection.
- Recording at a shaped speed or pitch, and native platforms.
- Crash recovery of a take in progress.

## Decisions

### Decision 1: A block stream beside the analysis frames

`PcmSubscriber` gains an optional `onBlock(block)` delivering contiguous mono blocks (`samples`, `sampleRate`, `startTimeSec` on the capture clock). The assembler runs only while some subscriber wants `onFrame`. `captureTimeSec` keeps its meaning (time of the frame's last sample). Alternative: de-overlap frames in the recorder by keeping each frame's last hop; rejected because it is fragile at the first frame and ties the recorder to the analysis frame size.

### Decision 2: One timeline, mapped by sampled anchors

The recorder needs "track position at the first captured sample". The two clocks are related through `performance.now()`: `AudioContext.getOutputTimestamp()` maps the capture context to it, and the media element's `currentTime` is sampled with `performance.now()` anchors (on `timeupdate` and a short interval while recording). A least-squares line over the recent anchors gives track position as a function of `performance.now()` with the jitter averaged out; the take stores `trackStartMs` from it. Alternative: route the media element into the capture context so one clock rules both. Rejected for now: it would force every track through Web Audio even when no one records, and the pitch shifter shows the cost. A spike (task 1.1) measures the error of the anchor approach; if it is worse than about 10 ms, the single-context route is revisited.

### Decision 3: Latency is estimated, measured, then nudged

The take's audio is late relative to the track by the output latency (track to ears, `AudioContext.outputLatency`, which differs for speakers, wired, and Bluetooth headphones) plus the input latency (voice to sample). The browser reports these only roughly. So:

1. **Default:** `outputLatency` plus `baseLatency` from the browser, used until calibrated.
2. **Calibration:** a short loopback measurement: the app plays a few clicks through the current output and finds them in the microphone signal by cross-correlation. This measures the true round trip for the current output device and is stored per output device label. It needs the clicks to reach the microphone, so it asks the user to hold the headphone to the microphone or use speakers, and says why. It does not need the user to tap in time, which would add human reaction time.
3. **Nudge:** the overlay has a per-take offset control (milliseconds, ±250) that is saved with the take, for what is left.

The applied compensation is stored on the take so a later recalibration does not silently move old takes. Alternative: a manual-nudge-only design; kept as the fallback if the spike shows loopback measurement is unreliable in browsers.

### Decision 4: Takes are WAV in their own IndexedDB store

Takes are written as 16-bit mono WAV at the capture sample rate: lossless, sample-accurate, trivial to decode, about 5 MB per minute at 44.1 kHz. The recorder converts blocks to Int16 as they arrive (half the memory of Float32), caps a take at 10 minutes, and writes the WAV and the take record in one transaction on stop. A new database holds `takes` (the metadata, no bytes) and `take-audio` (the Blob), keyed by take id and indexed by owner track. It has its own budget with a visible total in the existing offline files view area, and never evicts automatically: only the user deletes takes. Alternatives: MediaRecorder with Opus (small, but lossy, a second microphone path, no sample-accurate start); reusing the offline `AudioStore` (shares budget and eviction rules with downloaded tracks, which suits neither).

### Decision 5: The overlay rides the track's media element

The track keeps playing through the existing player. The take plays through an `AudioContext` as an `AudioBufferSourceNode` (the decoded WAV) into a gain node, started at `contextTime` computed from the track position, the take's `trackStartMs`, the compensation and the nudge. A sync controller (in `audio-mixing`) watches the media element and does the following:

- **Play:** schedule the take source for the aligned position (or part-way in, when the track is already past the take's start).
- **Pause:** stop the source; remember nothing, since position is derived from the track.
- **Seek and loop wrap:** stop and reschedule (a source node cannot seek).
- **Drift:** every 250 ms compare expected and actual take position; reschedule when the error exceeds a tolerance (initially 20 ms), with a short crossfade to avoid clicks.

The balance control sets the two gains: the take's gain node, and the track's volume on the media element (or the pitch graph's gain when active). Alternative: decode the track and play both from buffers on one context, replacing the transport. Rejected: it changes the whole playback stack for one feature, and long tracks would need decoding in memory. This transport-through-the-element design also suits `composite-tracks`, whose stems could be several elements or buffers behind the same controller; the controller depends on a small `Transport` and `Voice` interface, not on Web Audio.

### Decision 6: Speed and pitch shaping

Overlay and recording are available only at normal speed (1×) and zero pitch shift in this change; otherwise the controls explain why they are unavailable. A take recorded at 1× is on the track's own time, so alignment is plain. Playing a take at another speed means either resampling it (changing its pitch) or sending it through its own SoundTouch node with the same tempo and pitch; that is a later change, and the sync controller's tolerance and rescheduling are written so a rate can be added. Alternative: allow it now and accept pitch change in the take; rejected because a transposed take misleads the singer about their own pitch.

### Decision 7: A new framework-agnostic package, `@org/audio-mixing`

It holds the alignment math (track position, take start, compensation, nudge), the sync controller against `Transport` and `Voice` interfaces, the balance-to-gain mapping, and the clock-anchor fit from Decision 2, with injected clocks and timers so it is tested with fakes. It depends on `audio-library-models`, which also gets the `Take` type and its helpers. The Web Audio and media-element implementations stay in the app. `composite-tracks` will use the same controller for stems. Alternative: keep everything in the app; rejected because the README of `composite-tracks` already asks for one mixer designed once, and a package gives the logic a clean boundary and tests.

### Decision 8: Consent, indicator, and stopping

Recording is separate from the pitch tool's explanation: the first time the user starts a take, a short note says that audio is recorded and kept on this device under the track until deleted, and names the headphones assumption. While recording, the strip shows a clear recording state with elapsed time and a stop control. A take stops, keeping what was captured, when the user stops it, the app is hidden, the microphone is interrupted or ends, the track ends, storage fails, or the 10-minute cap is reached; the reason is shown. A take under one second is discarded with a note. Takes show their size, and deleting one frees it immediately. The pitch no-persistence guard test stays as is; a new guard test confirms the recording code is the only place that writes audio samples.

### Decision 9: Ownership and the model

A take records `ownerTrackId` using the same owner resolution that markers and lyrics use, so a take stays with the track when it is played from a playlist or an adjusted copy. It carries `id`, `name` (default `Take 1`, `Take 2`, …), `createdAt`, `durationMs`, `sampleRate`, `trackStartMs`, `appliedLatencyMs`, `nudgeMs`, and `sizeBytes`. Several takes per track are allowed; the overlay plays one at a time.

## Risks / Trade-offs

- [Clock anchors are noisier than expected] → Spike 1.1 measures it; fall back to routing the element into one context.
- [Browser latency values are wrong, especially Bluetooth] → Loopback calibration per output device plus a saved nudge; the default is labelled as an estimate.
- [Loopback calibration is awkward for headphone users] → Explain it plainly, allow a manual-only path, and keep it optional.
- [Drift or clicks when rescheduling] → A tolerance, a short crossfade, and reschedule on every transport event; checked live in 6.x.
- [Memory growth during long takes] → Int16 conversion on arrival, 10-minute cap.
- [Storage quota or eviction by the browser] → Request persistent storage when the first take is saved, show sizes, and report write failures as a stop reason.
- [A decoded take plus the track in memory] → A take is mono 16-bit before decode; only the selected take is decoded.
- [Scope is larger than the original "bare record" slice] → The tasks put the sync and latency spikes first so the plan can be cut back before UI work begins.

## Migration Plan

New database and new package; nothing existing is migrated. The `PcmSource` change is additive (an optional `onBlock`), and the pitch pipeline keeps using frames. Rollback is removing the tool row; stored takes stay in their own database and are harmless.

## Open Questions

- Do we offer to save a take to Drive in a follow-up change, or to download it as a WAV file first (smaller and needs no scope)?
- Should the overlay allow two takes at once to compare, or one at a time as designed?
- Is a 10-minute cap right for a full rehearsal piece, or should it be larger once memory is measured?
- Does Safari honour `getOutputTimestamp` and `outputLatency` well enough, or does it need the manual path as its default?
