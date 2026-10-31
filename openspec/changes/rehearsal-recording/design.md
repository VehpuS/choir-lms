## Context

`pitch-detection` added `PcmSource`: one shared microphone stream with several subscribers, unprocessed audio, and the `Practice tools` menu with a toggle row per tool. Its design (Decision 12) said a recorder could reuse it. Reading the code for this change shows two gaps:

- **Overlapping frames.** `PcmSource` delivers 2048-sample analysis frames at a 1024-sample hop (`pcm-frame-assembler.ts`). Consecutive frames share half their samples, so a recorder cannot concatenate them.
- **No shared clock.** `captureTimeSec` is the capture `AudioContext`'s `currentTime`, and that context belongs to the microphone path. The track plays through a media element (react-native-track-player on Shaka), whose `currentTime` is a different clock. The only other `AudioContext` is created by the pitch shifter, and only while pitch shaping is active. Decision 12's "clock shared with playback" is therefore not true yet.

Other facts that shape the design: playback on web is `window.rntp.getMediaElement()`; the SoundTouch worklet already routes that element through an `AudioContext` for pitch shifting; the offline `AudioStore` is an IndexedDB store with eviction and a budget meant for downloaded tracks; the `drive.file` scope and a Drive upload exist but are not used here.

## Goals / Non-Goals

**Goals:**

- Record a take while a track plays, at any speed and pitch shaping, and store a timeline of which track positions it was sung against, accurate to a few milliseconds after compensation.
- Let the user start and stop a take by hand at any point, over any segment of the song or an active loop, with the nearby markers shown.
- Play a take with its track and keep them in sync through play, pause, seek, and loop wrap, without ever shaping the take. A take's speed and pitch are fixed at recording and again at playback.
- Own a local store for takes that eviction of cached tracks can never touch.
- Put the sync and gain logic in one reusable, testable place.
- Keep each take a self-contained entry, independent of later changes to its track, markers, and loops.
- Export a bare recording and a mixdown, as a download or to new Drive files.

**Non-Goals:**

- Compressed export formats (MP3, AAC); a browser has no encoder for them and adding one is its own decision.
- Echo cancellation: headphones are assumed, as in pitch detection.
- Stretching or transposing a take to follow a track at a different speed than the one it was recorded against.
- Native platforms.
- Crash recovery of a take in progress.

## Decisions

### Decision 1: A block stream beside the analysis frames

`PcmSubscriber` gains an optional `onBlock(block)` delivering contiguous mono blocks (`samples`, `sampleRate`, `startTimeSec` on the capture clock). The assembler runs only while some subscriber wants `onFrame`. `captureTimeSec` keeps its meaning (time of the frame's last sample). Alternative: de-overlap frames in the recorder by keeping each frame's last hop; rejected because it is fragile at the first frame and ties the recorder to the analysis frame size.

### Decision 2: One timeline, mapped by sampled anchors

The recorder needs "track position at each captured sample", and the track may be paused, sought, looped, or running at a rate other than 1 while it records (the rate itself is fixed for the whole take, Decision 6). The two clocks are related through `performance.now()`: `AudioContext.getOutputTimestamp()` maps the capture context to it, and the media element's `currentTime` is sampled with `performance.now()` anchors (on `timeupdate` and a short interval while recording). A least-squares line over the recent anchors within one uninterrupted stretch of playback gives track position as a function of `performance.now()` with the jitter averaged out, and its slope is the effective rate. A seek, loop wrap, pause, or resume ends one stretch and starts the next. Because the rate is known and constant, each fit only has to find the offset (and may check the slope against the known rate). The recorder turns the stretches into the take's timeline (Decision 9). Alternative: route the media element into the capture context so one clock rules both. Rejected for now: it would force every track through Web Audio even when no one records, and the pitch shifter shows the cost. A spike (task 1.1) measures the error of the anchor approach; if it is worse than about 10 ms, the single-context route is revisited.

### Decision 3: Latency is estimated, nudged by hand, and optionally measured

The take's audio is late relative to the track by the output latency (track to ears, `AudioContext.outputLatency`, which differs for speakers, wired, and Bluetooth headphones) plus the input latency (voice to sample). The browser reports these only roughly. The compensation is a shift in wall-clock time: the track position a sample is filed under is the position the track had `latency` earlier, so it stays right at any playback rate. The approach puts the manual path first, since not every user can or wants to run a loopback:

1. **Default:** `outputLatency` plus `baseLatency` from the browser, used until the user sets something better, and labelled as an estimate.
2. **Nudge (the main manual path):** the overlay shows a `Sync` control right beside the balance: minus and plus buttons in 1 ms and 10 ms steps, a slider to ±250 ms, a reset, and a `Use for this device` action that stores the nudge as the compensation default for the current output device label, so the next take starts already adjusted. The nudge is saved with the take and can be changed at any time, and changes sound immediately while the overlay plays.
3. **Click calibration (opt-in):** offered as a secondary action in the same panel, never prompted for and never required. It plays a few clicks through the current output and finds them in the microphone signal by cross-correlation, which measures the true round trip, and saves the result as that device's default just as `Use for this device` does. It needs the clicks to reach the microphone, so it says to use speakers or hold the headphone to the microphone, and why. It does not need the user to tap in time, which would add human reaction time.

The compensation applied at recording time is stored on the take, and the nudge separately, so changing the device default never silently moves old takes. Alternative: loopback as the primary path; rejected because it fails for headphone users and for noisy rooms, and the nudge needs to work for everyone.

### Decision 4: Takes are WAV in their own IndexedDB store

Takes are written as 16-bit mono WAV at the capture sample rate: lossless, sample-accurate, trivial to decode, about 5 MB per minute at 44.1 kHz. The recorder converts blocks to Int16 as they arrive (half the memory of Float32), caps a take at 10 minutes, and writes the WAV and the take record in one transaction on stop. A new database holds `takes` (the metadata, no bytes) and `take-audio` (the Blob), keyed by take id and indexed by owner track. It has its own budget with a visible total in the existing offline files view area, and never evicts automatically: only the user deletes takes. Alternatives: MediaRecorder with Opus (small, but lossy, a second microphone path, no sample-accurate start); reusing the offline `AudioStore` (shares budget and eviction rules with downloaded tracks, which suits neither).

### Decision 5: The overlay rides the track's media element

The track keeps playing through the existing player. The take plays through an `AudioContext` as an `AudioBufferSourceNode` (the decoded WAV) into a gain node, started at `contextTime` computed from the track position, the take's timeline (Decision 9), and the nudge. A sync controller (in `audio-mixing`) watches the media element and does the following:

- **Play:** look up the take time for the current track position in the take's timeline and schedule the source there (part-way in when the track is already inside the take).
- **Pause:** stop the source; position is derived from the track, so nothing else is remembered.
- **Seek and loop wrap:** stop and reschedule at the newly looked-up position (a source node cannot seek).
- **Drift:** compare expected and actual take position every 250 ms and reschedule when the error exceeds a tolerance (initially 20 ms), with a short crossfade to avoid clicks. This always applies, because the track's speed cannot differ from the take's while a take is selected (Decision 6).

The balance control sets the two gains: the take's gain node, and the track's volume on the media element (or the pitch graph's gain when active). Alternative: decode the track and play both from buffers on one context, replacing the transport. Rejected: it changes the whole playback stack for one feature, and long tracks would need decoding in memory. This transport-through-the-element design also suits `composite-tracks`, whose stems could be several elements or buffers behind the same controller; the controller depends on a small `Transport` and `Voice` interface, not on Web Audio.

### Decision 6: Shaping touches only the track; the take is never shaped

Playback shaping (speed and pitch) is a property of the background track. A take is recorded from the microphone in real time and is always played at its natural speed and pitch, so the singer hears their own voice as sung. Consequences:

- **Recording under shaping is allowed, but the shaping is fixed for the take.** The speed and pitch in effect when the take starts (a saved adjusted track, or a session adjustment already set) are read once, stored on the take (Decision 9), and the speed and pitch controls are disabled while the take records, with a note saying why. A take sung against a track at 0.7× knows that one second of the take covered 0.7 s of track throughout. Changing speed mid-take is not supported: the user stops the take, adjusts, and starts a new one. Pitch shifts change nothing about timing, and are stored only so the take can say what it was recorded against.
- **Playback uses the take's shaping, and it is fixed too.** Selecting a take applies the speed and pitch stored on it to the session and locks the speed and pitch controls with a note ("Locked to this take's speed and pitch"); deselecting the take restores the shaping that was set before and unlocks them. The take therefore always plays against the track exactly as it was sung against it, stays aligned for its whole length, and never needs a stretched or resampled copy. Playing a take with other speed or pitch is not supported: the user exports a mixdown (Decision 12) and plays that file with the ordinary track controls. This is expected to be a rare need.

Alternatives: gate recording and overlay to normal speed; rejected because slowed practice is the main use of the app. Let the track change speed under a selected take, with the take free-running or stretched by its own SoundTouch node; rejected because the free-running take drifts apart and stretching alters the singer's voice, and the exported mixdown already covers the use.

### Decision 7: A new framework-agnostic package, `@org/audio-mixing`

It holds the alignment math (the timeline lookup in both directions, nudge), the sync controller against `Transport` and `Voice` interfaces, the balance-to-gain mapping, and the clock-anchor fit from Decision 2, with injected clocks and timers so it is tested with fakes. It depends on `audio-library-models`, which also gets the `Take` type and its helpers. The Web Audio and media-element implementations stay in the app. `composite-tracks` will use the same controller for stems. Alternative: keep everything in the app; rejected because the README of `composite-tracks` already asks for one mixer designed once, and a package gives the logic a clean boundary and tests.

### Decision 8: Consent, indicator, and stopping

Recording is separate from the pitch tool's explanation: the first time the user starts a take, a short note says that audio is recorded and kept on this device under the track until deleted, and names the headphones assumption. While recording, the strip shows a clear recording state with elapsed time and a stop control. A take stops, keeping what was captured, when the user stops it, the app is hidden, the microphone is interrupted or ends, the track ends, storage fails, or the 10-minute cap is reached; the reason is shown. A take under one second is discarded with a note. Takes show their size, and deleting one frees it immediately. The pitch no-persistence guard test stays as is; a new guard test confirms the recording code is the only place that writes audio samples.

### Decision 9: Ownership and the model

A take records `ownerTrackId` using the same owner resolution that markers and lyrics use, so a take stays with the track when it is played from a playlist or an adjusted copy. It carries `id`, `name` (default `Take 1`, `Take 2`, …), `createdAt`, `durationMs`, `sampleRate`, `appliedLatencyMs`, `nudgeMs`, `sizeBytes`, an optional `loop` reference with its range, a `shaping` record (`{ rate, pitchSemitones }`, read once at the start and constant for the take), and a `timeline`. The timeline is a list of segments, one per uninterrupted stretch of playback while recording: `{ takeStartMs, takeEndMs, trackStartMs, held }`, where a paused track is a segment with `held` set (the position holds) and a seek or loop wrap starts a new segment at the new position; the track position advances by `shaping.rate` per unit of take time in every other segment. Looking up a track position returns every take time that was sung against it, which is one for a plain take and one per pass for a loop take. Latency compensation is already applied inside the segment boundaries (Decision 3). Several takes per track are allowed; the overlay plays one at a time.

The take is also a snapshot, so that it does not depend on the track staying as it was. At recording time it stores a `source` record: the Drive file id, file name, content version (`modifiedTime`, the same value the offline cache keys on), track duration, whether the track was an adjusted copy and what it was adjusted from, plus the title and the loop (name and range) and the markers inside the take's span (name and position) as they were. Shaping and the punch range are already in the timeline and the optional armed range. Listings, spans, and exports read this snapshot rather than the live library. The live track is consulted only for two things: finding the take again (by the owner key) and playing the overlay against audio. A take whose track is renamed, retagged, or whose markers and loops change keeps its recorded names; the audio itself is kept with the take (Decision 13), so the overlay and the mixdown keep working even if the track is later deleted or replaced on Drive. The take shows `Original track changed` when the live track's content version no longer matches, and the overlay then plays against the kept copy rather than the live file.

### Decision 10: Segments, loops, and marker context

Recording always starts and stops by hand, from wherever the track is. To record a segment, the user seeks (or uses a marker or loop to jump) and starts the take, then stops it; the take covers whatever stretch of the song played in between, including seeks. Nothing requires a take to start at the beginning of the track or to end with it.

When a loop is active as the take starts, the take is a loop take: it keeps a reference to the loop and its range, may span several passes, and is listed under the loop as well as under the track. With the take selected and the same loop active, pass n of the track plays pass n of the take; after the last recorded pass the take is silent, so a two-pass take does not repeat itself under a ten-pass loop (the user can start a new take). Without a loop, a take selected for a track plays wherever its timeline says.

Marker context is read-only: the recording strip shows the previous and next marker names and positions beside the elapsed time; the takes list shows a take's span as marker names when its edges fall within a few seconds of markers (for example `Verse 2 → Chorus`) and as times otherwise. Marker lookups reuse the markers owner resolution and are optional: a track with no markers just shows times.

### Decision 11: Punch ranges are the last slice

Arming a take to start and stop at a chosen marker, or at a loop's ends (punch in and out), is built after everything above works. It adds an armed state (`Record from Chorus to Bridge`) that begins the take when playback reaches the in point and ends it at the out point. Since manual start and stop and loop takes already exist, punch ranges only add automatic triggers, and the slice can be cut without leaving a gap. The in point uses the same position tracking as the timeline so the first sample lands within the same tolerance.

### Decision 12: Export a bare recording and a mixdown, to the device or to Drive

Each export goes either to the device or to Drive. `Download` saves the file through the browser with no permission and no network. `Save to Drive` creates a new file in a folder the user chooses, using the destination step of `sheet-music-save-to-drive` (nothing is written before the user confirms the folder, and the `drive.file` scope is asked for only at that point). Both are 16-bit WAV, named from the snapshot (`<Track> - <Take name>` and `<Track> - <Take name> (mix)`) and editable in the dialog.

- **Bare recording:** the stored WAV, uploaded as it is. No decode, no track.
- **Mixdown:** rendered offline in the browser to reproduce what the singer heard, using only the snapshot and the timeline: for each timeline segment, the matching stretch of the original track at the take's stored rate and pitch (silence while the track was paused), placed in recording time, then the take placed with its applied compensation and nudge, mixed at the balance chosen in the export dialog. Loop passes, seeks, pauses, and a punch range therefore come out as they happened, because the timeline already records them. The render uses an `OfflineAudioContext`, the same SoundTouch processor that live shaping uses, and the kept copy of the original audio (Decision 13). Output is stereo if the track is, otherwise mono, at the track's sample rate, with the take resampled to it.
- **Source availability:** the mixdown reads the kept copy, so it does not depend on Drive. Only a take saved without a kept copy (the user turned it off, or it was freed) can lack one; the dialog then says why the mixdown is unavailable and still offers the bare recording.
- **Upload:** the existing helper is a single multipart request with a 25 MB limit; a ten-minute mono take is about 50 MB and a stereo mixdown double that. `google-drive` gains a resumable upload with progress, cancel, and retry from the last chunk, and the existing `needs-write-access`, `quota`, `folder-not-writable`, and `offline` failures map to the same user messages. A successful export reports the file name and folder; the new file is an ordinary Drive file and will appear as a track if its folder is in the library.
- **Memory:** the render holds the mixed buffer (a ten-minute stereo mix at 44.1 kHz is about 100 MB as Float32), so the render works in chunks and encodes to Int16 as it goes, staying near the size of the output.

Alternatives: mixdown from the current live shaping state (what the user hears now) rather than the recorded one; rejected because the mix would not match what was sung against. Capture the mixed output live while recording; rejected because it would fix the balance at record time and miss seeks the user makes later. Compressed formats; rejected for now (Non-Goals).

### Decision 13: The original audio is kept as an offline entry owned by the takes

When a take is saved, the original track's audio is kept offline through the existing audio store, as a pinned entry that automatic eviction never removes. The store is keyed by Drive file id and holds one version, so a take's copy needs its own key: the entry is stored under `<driveFileId>@<contentVersion>` with the ids of the takes that use it as owners (the same owner list scores already use). Several takes of the same track and version share one entry; if the track is already kept offline at that version, the existing bytes are adopted by adding the take as an owner instead of copying them. The entry is removed when the last owning take is deleted. Because it counts as pinned offline data, it appears in the offline files view next to the takes total, labelled as kept for takes, and its size is included in what the take reports. Saving a take offers `Keep the original with this take`, on by default and optional to save space; a take without it plays alone and exports only the bare recording once the live track changes.

Alternative: store the copy inside the takes database; rejected because it would duplicate the file the offline cache may already hold and would sit outside the offline files view and its budget controls.

## Risks / Trade-offs

- [Keeping originals costs storage, tens of megabytes per track] → Shared across takes of the same version, adopted from the offline cache when already present, visible in the offline files view, and optional per take.
- [Mixdown render is slow or memory-heavy for long takes] → Chunked render with Int16 encoding, progress and cancel, and spike 1.4 measures the time and memory of a ten-minute mixdown with a shaped track.
- [Offline SoundTouch output differs from the live graph] → Spike 1.4 compares a render with a live capture; accept small differences, document them.
- [Large uploads fail partway] → Resumable upload with retry from the last chunk.
- [The original track changes before a mixdown] → The snapshot's content version detects it, the dialog says so, and the bare recording stays available.

- [Clock anchors are noisier than expected] → Spike 1.1 measures it; fall back to routing the element into one context.
- [Browser latency values are wrong, especially Bluetooth] → A quick nudge that can be saved as the device default; opt-in click calibration for those who want a measurement; the default is labelled as an estimate.
- [Loopback calibration is awkward for headphone users] → It is opt-in and never required; the nudge is the main path.
- [Users want to hear a take at another speed] → Not supported by design; the mixdown export plus the ordinary track controls covers it.
- [The timeline must be right across pauses, seeks, and loop wraps] → Spike 1.1 includes these; the lookup is pure and specified with synthetic timelines.
- [Drift or clicks when rescheduling] → A tolerance, a short crossfade, and reschedule on every transport event; checked live in 6.x.
- [Memory growth during long takes] → Int16 conversion on arrival, 10-minute cap.
- [Storage quota or eviction by the browser] → Request persistent storage when the first take is saved, show sizes, and report write failures as a stop reason.
- [A decoded take plus the track in memory] → A take is mono 16-bit before decode; only the selected take is decoded.
- [Scope is larger than the original "bare record" slice] → The tasks put the sync and latency spikes first so the plan can be cut back before UI work begins.

## Migration Plan

New database and new package; nothing existing is migrated. The `PcmSource` change is additive (an optional `onBlock`), and the pitch pipeline keeps using frames. Rollback is removing the tool row; stored takes stay in their own database and are harmless.

## Open Questions

- Is `Keep the original with this take` right as on by default, or should it follow whether the track is already kept offline?
- Should the overlay allow two takes at once to compare, or one at a time as designed?
- Is a 10-minute cap right for a full rehearsal piece, or should it be larger once memory is measured?
- After the last recorded pass of a loop take, is silence right, or should the take repeat or the last pass hold?
- Does Safari honour `getOutputTimestamp` and `outputLatency` well enough, or does it need the manual path as its default?
