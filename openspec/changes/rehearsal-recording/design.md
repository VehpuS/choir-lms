## Context

`pitch-detection` added `PcmSource`: one shared microphone stream with several subscribers, unprocessed audio, and the `Practice tools` menu with a toggle row per tool. Its design (Decision 12) said a recorder could reuse it. Reading the code for this change shows two gaps:

- **Overlapping frames.** `PcmSource` delivers 2048-sample analysis frames at a 1024-sample hop (`pcm-frame-assembler.ts`). Consecutive frames share half their samples, so a recorder cannot concatenate them.
- **No shared clock.** `captureTimeSec` is the capture `AudioContext`'s `currentTime`, and that context belongs to the microphone path. The track plays through a media element (react-native-track-player on Shaka), whose `currentTime` is a different clock. The only other `AudioContext` is created by the pitch shifter, and only while pitch shaping is active. Decision 12's "clock shared with playback" is therefore not true yet.

Other facts that shape the design: playback on web is `window.rntp.getMediaElement()`; the SoundTouch worklet already routes that element through an `AudioContext` for pitch shifting; the offline `AudioStore` is an IndexedDB store with an automatic cache (least-recently-used eviction within a size budget) and a pinned `Keep offline` tier; the library (markers, lyrics, loops, playlists) is device-local state keyed by track, with markers and lyrics owned by the track and not library entities; adjusted tracks are `DriveAudioSource` records with `adjustment.sourceRef`, and loops belong to a track or to an adjusted copy; the `drive.file` scope and a Drive upload exist but are not used here.

## Goals / Non-Goals

**Goals:**

- Record while a track plays, at any shaping, and store a timeline of which track positions the recording was sung against, accurate to a few milliseconds after compensation.
- Let the user start and stop by hand at any point, over any segment, an active loop, or a punch range, with the nearby markers shown.
- Play a recording with its track in sync through play, pause, seek, and loop wrap, without ever shaping the recording, and open it in exactly the context it was made in.
- Keep each recording self-contained metadata, so overlay and export can be rebuilt from it without keeping copies of the original audio.
- Keep the raw recording in dedicated storage that is never purged automatically, and cache only the derived overlay material, which can be purged.
- Make recordings browsable (per track, per loop, and across the library), queueable, and usable in playlists without becoming library files.
- Export a recording and a mix, as a download or to new Drive files, by hand or automatically.
- Put the sync and gain logic in one reusable, testable place.

**Non-Goals:**

- Echo cancellation: headphones are assumed, as in pitch detection.
- Stretching or transposing a recording to follow a track at a different speed.
- Compressed export formats (MP3, AAC); a browser has no encoder for them and adding one is its own decision.
- Native platforms.
- Crash recovery of a recording in progress. The chunked store leaves a recording marked `recording` with its checkpointed timeline if the app dies; recovering it is a possible follow-up (tasks 14.2), not part of this change.
- Syncing recordings between devices (they live on the device that made them; exports and auto-export give Drive copies, not sync).

## Decisions

### Decision 1: A block stream beside the analysis frames

`PcmSubscriber` gains an optional `onBlock(block)` delivering contiguous mono blocks (`samples`, `sampleRate`, `startTimeSec` on the capture clock). The assembler runs only while some subscriber wants `onFrame`. `captureTimeSec` keeps its meaning (time of the frame's last sample). Alternative: de-overlap frames in the recorder by keeping each frame's last hop; rejected because it is fragile at the first frame and ties the recorder to the analysis frame size.

### Decision 2: One timeline, mapped by sampled anchors

The recorder needs "track position at each captured sample", and the track may be sought, looped, or paused and resumed (a pause pauses the take, Decision 17), or running at a rate other than 1 while it records (the rate itself is fixed for the whole recording, Decision 6). The two clocks are related through `performance.now()`: `AudioContext.getOutputTimestamp()` maps the capture context to it, and the media element's `currentTime` is sampled with `performance.now()` anchors (on `timeupdate` and a short interval while recording). A least-squares line over the recent anchors within one uninterrupted stretch of playback gives track position as a function of `performance.now()` with the jitter averaged out. A seek, loop wrap, pause, or resume ends one stretch and starts the next. Because the rate is known and constant, each fit only has to find the offset (and may check the slope against the known rate). The recorder turns the stretches into the recording's timeline (Decision 9). Alternative: route the media element into the capture context so one clock rules both. Rejected for now: it would force every track through Web Audio even when no one records, and the pitch shifter shows the cost. A spike (task 1.1) measures the error of the anchor approach; if it is worse than about 10 ms, the single-context route is revisited.

### Decision 3: Latency is estimated, nudged by hand, and optionally measured

The recording's audio is late relative to the track by the output latency (track to ears, `AudioContext.outputLatency`, which differs for speakers, wired, and Bluetooth headphones) plus the input latency (voice to sample). The browser reports these only roughly. The compensation is a shift in wall-clock time: the track position a sample is filed under is the position the track had `latency` earlier, so it stays right at any playback rate. The manual path comes first, since not every user can or wants to run a loopback:

1. **Default:** `outputLatency` plus `baseLatency` from the browser, used until the user sets something better, and labelled as an estimate.
2. **Nudge (the main manual path):** the overlay shows a `Sync` control right beside the balance: minus and plus buttons in 1 ms and 10 ms steps, a slider to ±250 ms, a reset, and a `Use for this device` action that stores the nudge as the compensation default for the current output device label, so the next recording starts already adjusted. The nudge is saved with the recording and can be changed at any time, and changes sound immediately while the overlay plays.
3. **Click calibration (opt-in):** offered as a secondary action in the same panel, never prompted for and never required. It plays a few clicks through the current output and finds them in the microphone signal by cross-correlation, which measures the true round trip, and saves the result as that device's default just as `Use for this device` does. It needs the clicks to reach the microphone, so it says to use speakers or hold the headphone to the microphone, and why. It does not need the user to tap in time, which would add human reaction time.

The compensation applied at recording time is stored on the recording, and the nudge separately, so changing the device default never silently moves old recordings. Alternative: loopback as the primary path; rejected because it fails for headphone users and for noisy rooms, and the nudge needs to work for everyone.

### Decision 4: Recordings are WAV in their own, never-purged IndexedDB store

Recordings are written as 16-bit mono WAV at the capture sample rate: lossless, sample-accurate, trivial to decode, about 5 MB per minute at 44.1 kHz. The recorder converts blocks to Int16 as they arrive (half the memory of Float32) and writes them to storage **while recording**, in chunks of about ten seconds (about 900 KB), so memory use stays at one chunk however long the take runs and a recording is limited by free storage, not by a fixed length (Decision 20). A new database holds `recordings` (the metadata, no bytes) and `recording-audio` (the chunks as Blobs, keyed by recording id and chunk index). The recording record is created when recording starts, marked `recording`, and each chunk write also checkpoints the timeline captured so far, so everything written is already safe if a later write fails; stopping writes the final timeline and size and clears the mark. A WAV is assembled on demand as a header followed by the chunks (a `Blob` of blobs, not copied into memory), for export and for decoding.

The raw recording is the user's own work and cannot be recreated, so this store has no cache tier and no budget: nothing removes a recording except the user deleting it. Cache clearing, offline-cache eviction, forgetting a Drive session, and signing out do not touch it. The app asks the browser for persistent storage when the first recording is saved, shows the total used in Settings and the offline files view, and reports a failed write (quota or a blocked store) as a stop reason: a failed chunk is retried a few times with a short backoff while capture continues (a chunk write is all-or-nothing, so a retry cannot duplicate it), and only a failure that outlasts the retries stops the recording; every chunk written before it is kept and only the unwritten tail (up to one chunk) can be lost, so the user can still export what was saved. Safety beyond the device comes from export (Decision 12) and auto-export (Decision 19). Alternatives: MediaRecorder with Opus (small, but lossy, a second microphone path, no sample-accurate start); the track `AudioStore` (its eviction and budget rules would put recordings at risk); automatic and kept tiers like tracks (an earlier draft; rejected because evicting a raw recording destroys it).

### Decision 5: The overlay rides the track's media element

The track keeps playing through the existing player. The recording plays through an `AudioContext` as `AudioBufferSourceNode`s (the WAV decoded a window at a time, about thirty seconds, with the next window decoded ahead of the playhead, because a long recording cannot be held decoded in memory) into a gain node, started at `contextTime` computed from the track position, the recording's timeline (Decision 9), and the nudge. A sync controller (in `audio-mixing`) watches the media element and does the following:

- **Play:** look up the recording time for the current track position in the timeline and schedule the source there (part-way in when the track is already inside the recording).
- **Pause:** stop the source; position is derived from the track, so nothing else is remembered.
- **Seek and loop wrap:** stop and reschedule at the newly looked-up position (a source node cannot seek).
- **Drift:** compare expected and actual recording position every 250 ms and reschedule when the error exceeds a tolerance (initially 20 ms), with a short crossfade to avoid clicks. This always applies, because the track's speed cannot differ from the recording's while one is selected (Decision 6).

The balance control (live for the session; the recording starts at its saved balance, Decision 9) sets the two gains: the recording's gain node, and the track's volume on the media element (or the pitch graph's gain when active). Alternative: decode the track and play both from buffers on one context, replacing the transport. Rejected: it changes the whole playback stack for one feature, and long tracks would need decoding in memory. This transport-through-the-element design also suits `composite-tracks`, whose stems could be several elements or buffers behind the same controller; the controller depends on a small `Transport` and `Voice` interface, not on Web Audio.

### Decision 6: Shaping touches only the track; the recording is never shaped

Playback shaping (speed and pitch) is a property of the background track. A recording is captured from the microphone in real time and is always played at its natural speed and pitch, so the singer hears their own voice as sung. Consequences:

- **Recording under shaping is allowed, but the shaping is fixed for the recording.** The speed and pitch in effect when it starts (a saved adjusted track, or a session adjustment already set) are read once, stored on the recording (Decision 9), and the speed and pitch controls are disabled while it records, with a note saying why. A recording sung against a track at 0.7× knows that one second of it covered 0.7 s of track throughout. Changing speed mid-recording is not supported: the user stops, adjusts, and starts a new one. Pitch shifts change nothing about timing, and are stored only so the recording can say what it was recorded against.
- **Playback uses the stored shaping, and it is fixed too.** Playing a recording applies the speed and pitch stored on it and locks those controls with a note ("Locked to this recording's speed and pitch"); playing anything else (another track, loop, or recording, or the next queue item) loads that item's own shaping and unlocks them, exactly as moving between tracks does today. The recording therefore always plays against the track exactly as it was sung against it and stays aligned for its whole length. Playing a recording with other speed or pitch is not supported: the user exports a mix (Decision 12) and plays that file with the ordinary track controls. This is expected to be a rare need.

Alternatives: gate recording and overlay to normal speed; rejected because slowed practice is the main use of the app. Let the track change speed under a selected recording, with the recording free-running or stretched by its own SoundTouch node; rejected because the free-running recording drifts apart and stretching alters the singer's voice, and the exported mix already covers the use.

### Decision 7: A new framework-agnostic package, `@org/audio-mixing`

It holds the alignment math (the timeline lookup in both directions, nudge), the sync controller against `Transport` and `Voice` interfaces, the balance-to-gain mapping, and the clock-anchor fit from Decision 2, with injected clocks and timers so it is tested with fakes. It depends on `audio-library-models`, which also gets the `Recording` type and its helpers. The Web Audio and media-element implementations stay in the app. `composite-tracks` will use the same controller for stems. Alternative: keep everything in the app; rejected because the README of `composite-tracks` already asks for one mixer designed once, and a package gives the logic a clean boundary and tests.

### Decision 8: Consent, indicator, and stopping

Recording is separate from the pitch tool's explanation: the first time the user starts a recording, a short note says that audio is recorded and kept on this device under the track until the user deletes it (never removed automatically), that it can be exported or auto-exported to Drive, and names the headphones assumption. While recording, the strip shows a clear recording state with elapsed time and a stop control. A recording stops, keeping what was captured, when the user stops it, the app is hidden, the microphone is interrupted or ends, the track ends, storage fails or runs low (Decision 20), an armed punch range reaches its out point, or the recording reaches the WAV format's size limit; the reason is shown. A recording under one second is discarded with a note. The pitch no-persistence guard test stays as is; a new guard test confirms the recording code is the only place that writes audio samples.

### Decision 9: Metadata makes a recording self-contained

A recording is a record owned by the track or loop it was made on (Decision 10), and it carries enough to rebuild its overlay and its mix without any copy of the original audio:

- `id`, `name` (default `Recording 1`, `Recording 2`, …), `createdAt`, `durationMs`, `sampleRate`, `sizeBytes`, `appliedLatencyMs`, `nudgeMs`, and the storage tier.
- `source`: the Drive file id, file name, content version (`modifiedTime`, the value the audio cache already keys on), and duration of the track audio it was recorded against.
- `lineage`: the owner chain at recording time: the parent track (file id, name), the saved adjusted copy if any (id, name, and its adjustment values: speed, pitch), and the loop if any (id, name, start and end). The adjustment values are stored even when the adjusted copy is later deleted, and for session adjustments that were never saved the values are in `shaping`.
- `shaping`: `{ rate, pitchSemitones }`, read once at the start and constant for the recording.
- `balance`: the saved balance of the recording (0 to 100, default 50): where it starts when played, and the default for exports and for playlist and queue playback. It changes only on purpose (user decision 2026-11-02): from a slider in the save sheet, from `Save as default` beside the balance control while it plays, or by keeping the value chosen in the export dialog. Moving the balance control while listening is a live adjustment for that session only. Wherever the balance is set without playback (the save sheet, the export dialog), a `Preview` plays the recording over its track at the balance on screen and follows the slider while it plays, so the user can hear what they are choosing; leaving the place stops the preview, and the saved balance changes only when the user keeps it (user decision 2026-11-02).
- `engineVersion`: a version tag for the shaping and mixing code that produced and renders the recording, so a render can say when its algorithms differ from the ones in use.
- `markers`: the markers inside the recording's span (name and position) as they were.
- `punch`: the armed in and out points and the pre-roll, when the recording was started from a punch range.
- `timeline`: a list of segments, one per uninterrupted stretch of playback while recording: `{ recordingStartMs, recordingEndMs, trackStartMs, held }`, where a paused track is a segment with `held` set (the position holds) and a seek or loop wrap starts a new segment at the new position; the track position advances by `shaping.rate` per unit of recording time in every other segment. Looking up a track position returns every recording time that was sung against it, which is one for a plain recording and one per pass for a loop recording. Latency compensation is already applied inside the segment boundaries (Decision 3).

**The mix is replicable from this record.** A mix is a pure function of three things: this metadata, the bare recording's audio, and the original track audio at `source.contentVersion`. The record holds every other input the render needs (the timeline, the stored shaping, the compensation and nudge, the balance, the punch range, the output layout derived from the original), and the render has no other state: no live session, no cache, no clock. The same inputs on the same `engineVersion` give the same mix, which a golden-signal test checks. Lists, spans, and exports read this record rather than the live library, so a renamed track, moved markers, or a deleted loop do not change a recording's description. The audio the overlay and the mix need is resolved from `source` when wanted (Decision 13).

### Decision 10: Ownership, loops, and adjusted tracks decide where a recording shows

A recording is owned by exactly one entity, the one it was made on: a track, a saved adjusted track, or a loop (of a track or of an adjusted track). Loops are top-level entities with their own view, so:

- **A recording made on a loop** belongs to the loop. The loop's view lists only recordings made on that loop. The parent track shows them only in its `Loops` section, grouped by loop, and never in its main list of whole-track and segment recordings.
- **A recording made on an adjusted track** belongs to the adjusted track and is also listed under its parent track, labelled with the adjustment (for example `0.7×, +2`). If the recording was made on a loop of the adjusted track, it is listed in the adjusted track's `Loops` section and in the parent's `Loops` section, and in the loop's own view.
- **A recording made over a session adjustment that was never saved** belongs to the track, with the adjustment values stored in `shaping` and `lineage`.
- **Not library files:** like markers and lyrics, recordings are not tracks. They do not appear in the Files tree or in track search results. They appear in the playback screen's Recordings panel, in loop and adjusted-track views as described, in the Library `Recordings` view (Decision 15), and in playlists and queues as playlist items (Decision 16).

The Recordings panel is a viewer, like lyrics and sheet music, and opens from a `Recordings` action in the playback screen's `More actions` menu (beside `Make loop` and `Add marker here`), whether or not the Recording tool is on. There is no top-level button or count badge, since recording is occasional; the menu row shows a muted count. The tool only controls the recording strip and the start and arm controls.

### Decision 11: A recording is a playable item that plays in the context it was made in, locked

A recording is a playable item like a track or a loop (user decision 2026-11-02): it is played, queued, and added to playlists, and playing another item replaces it. It is only reached from overflow actions and lists, never as a library file. Selecting a recording from any list plays it, on its track, in the context it was made in:

- **A loop recording** plays the loop, with the loop's range as the only playable range.
- **A recording of an adjusted track** plays the adjusted track, with its adjustment active.
- **A segment or punch recording** plays the owning track limited to the recorded range, from the first to the last track position the timeline covers. The waveform, position, and seeking show only that range, and playback stops at the end of the range and returns to its start.
- **Any other adjustment** (speed and pitch set on the session) is applied for the recording: the stored speed and pitch are set and locked. The view does not distinguish adjustments that were saved as a track from ones that were not.

The item is titled with the recording's name and described by where it was made (`Recording · <loop>`, `Recording · <adjustment>`, or `Recording · <span>`). While it is the active item, the range, the loop, the speed, and the pitch are locked, with a note saying why, and the balance and the sync control are available. There is no separate `Leave recording` control: choosing another item leaves it, as with any track, and the previous shaping is not restored because no other item expects it. Playback never needs a different speed because the item carries the one it was made with.

### Decision 12: Export a recording and a mix, to the device or to Drive

Each export goes either to the device or to Drive. `Download` saves the file through the browser with no permission and no network. `Save to Drive` creates a new file in a folder the user chooses, using the destination step of `sheet-music-save-to-drive` (nothing is written before the user confirms the folder, and the `drive.file` scope is asked for only at that point). Both are 16-bit WAV, named from the metadata (`<Track> - <Recording name>` and `<Track> - <Recording name> (mix)`) and editable in the dialog.

- **Recording only:** the stored WAV, uploaded as it is. No decode, no track.
- **Mix:** rendered offline in the browser to reproduce what the singer heard, using only the metadata and the timeline: for each timeline segment, the matching stretch of the original track at the recording's stored rate and pitch (silence while the track was paused), placed in recording time, then the recording placed with its applied compensation and nudge, mixed at the balance chosen in the export dialog. Loop passes, seeks, pauses, and a punch range therefore come out as they happened, because the timeline already records them. The render uses an `OfflineAudioContext`, the same SoundTouch processor that live shaping uses, and the original audio resolved as in Decision 13. Output is stereo if the track is, otherwise mono, at the track's sample rate, with the recording resampled to it.
- **Source availability:** if the original cannot be resolved (deleted on Drive, no connection and not stored offline), the dialog says why the mix is unavailable and still offers the recording alone.
- **Upload:** the existing helper is a single multipart request with a 25 MB limit; a ten-minute mono recording is about 50 MB and a stereo mix double that. `google-drive` gains a resumable upload with progress, cancel, and retry from the last chunk, and the existing `needs-write-access`, `quota`, `folder-not-writable`, and `offline` failures map to the same user messages. A successful export reports the file name and folder; the new file is an ordinary Drive file and will appear as a track if its folder is in the library.
- **Memory:** the render holds the mixed buffer (a ten-minute stereo mix at 44.1 kHz is about 100 MB as Float32), so the render works in chunks and encodes to Int16 as it goes, staying near the size of the output.

Alternatives: mix from the current live shaping state; rejected because the mix would not match what was sung against. Capture the mixed output live while recording; rejected because it would fix the balance at record time and miss seeks the user makes later.

### Decision 13: The original audio is found from metadata; recordings add no cache of their own

A recording does not store, pin, or own any copy of the track's audio, and the recording feature adds no audio cache. The overlay and the mix ask the normal track audio path for `source.driveFileId`, which serves it from the recent playback cache, the offline store, or Drive, whichever has it. Consequences:

- Overlay and mix are rebuildable from metadata alone, as long as the original and the bare recording are available (Decision 9).
- If the file's content version differs from `source.contentVersion`, the overlay plays against the current file and says `Original track changed`: alignment may be off, and the sync control can compensate. The mix export warns the same way and goes ahead only if the user confirms.
- If the original cannot be fetched (deleted, or offline and not stored), the recording plays alone, and the overlay says why; the recording alone can still be exported.

**Why no overlay cache.** The track plays through the existing player, which loads the whole file once (on web it is fetched with auth headers into a blob URL) and already has a purgeable recent-playback cache and a `Keep offline` store. The Web Audio voice plays only the recording. A separate cache of the decoded stretch of the original would help only if the track were played from it, and that needs a second transport next to the existing player and a decode of audio the player already holds. The mix export decodes the track once per render. So the existing track caches are the performance layer: a track that was just played is still cached, and a track kept offline is always there. Spike 1.3 measures the time to the first overlay sound with the track cached and with it evicted; a cache is revisited only if that is too slow.

**Offline overlay** therefore means the track is stored. A recording's row menu offers `Keep track offline` and `Remove track from offline`, which call the existing track actions (and say they apply to the whole track and all its recordings), and bulk selections do the same for the tracks involved. Keeping a track offline never asks about its recordings, because recordings are always on the device (Decision 4). Lists flag `Needs connection for overlay` when the track is neither cached nor kept.

Alternatives: pin a copy of the original with each recording (an earlier draft, as an option); rejected as a second copy and an option the user would have to understand. A purgeable cache of the original's covered segment, or of a rendered composite at the saved balance; rejected for the reasons above, and because the balance and sync are live.

### Decision 14: Storage settings and the offline files view

Settings gains a `Recordings` group beside the offline settings: the total used by recordings (read-only, with the line `Recordings are never removed automatically`) and the auto-export settings (Decision 19). The offline files view lists recordings in their own group with their sizes and a `Delete` action only; recordings are never listed as cache, and there is no recordings cache size.

### Decision 15: A Library Recordings view

The Library gains a `Recordings` view beside the tracks and playlists views, listing every recording on the device with: a search field (recording name, track title, loop name, marker names in its span), filters (`Whole track`, `Segment`, `Loop`, `Adjusted`, `On Drive`, `Not on Drive`, `Original changed`, `Needs connection for overlay`, and a track picker), a sort (newest, track, length, name), and rows showing the name, the track and span, the tags (loop, adjusted, Drive export status, needs a connection for overlay), length, and size. Selecting rows enters the shared multi-selection with the bulk actions that apply: `Play`, `Play next`, `Add to queue`, `Add to playlist`, `Keep track offline` or `Remove track from offline`, `Export`, and `Delete`. Opening a row opens its context (Decision 11). Recordings are still not library files: the view is a projection of the recordings store, and the Files tree and track search never list them.

### Decision 16: Recordings in playlists and the queue

A playlist entry can reference a recording, as it can a track or a loop. Playing one plays it in its recorded context (Decision 11), plays the recording over its track at the saved balance for that recording, stops at the end of the recorded range, and moves to the next item; shaping is the recording's own and is restored for the next item. A recording that was deleted shows as unavailable and is skipped with a message, as removed tracks are. `Play next`, `Add to queue`, and `Add to playlist` work from every recording list, the Library view, and bulk selection.

### Decision 17: Segments, loops, and marker context

Recording is tied to playback and ends by hand. Pressing `Record` while the track plays starts the take at once. Pressing it while the track is stopped or paused arms it: the strip says `Waiting for playback`, nothing is kept, and the take starts when the track plays. A pause pauses the take with the track (the strip shows `Paused with track`, elapsed time stops, no silence is stored) and resume continues the same take; a seek or loop wrap keeps the take and starts a new timeline segment. Only `Stop` (or one of the stop reasons in Decision 8) ends it. To record a segment, the user seeks (or uses a marker or loop to jump), presses `Record`, plays, and stops; it covers whatever stretch of the song played in between, including seeks. Nothing requires it to start at the beginning of the track or to end with it. Recording over a paused track (for example singing a cappella against silence) is not supported; an earlier draft allowed it and recorded straight through a pause, which surprised the first user to try it (task 5.4). The `held` flag stays on timeline segments so recordings already made, and any future use, remain readable, but a take no longer produces them. When a loop is active as the recording starts, it is a loop recording (Decision 10): its owner is the loop, and it may span several passes. With the loop active and the recording selected, pass n of the loop plays pass n of the recording; after the last recorded pass the recording is silent.

Marker context is read-only: the recording strip shows the previous and next marker names and positions beside the elapsed time; lists show a recording's span as marker names when its edges fall within a few seconds of markers (for example `Verse 2 → Chorus`) and as times otherwise. Marker lookups reuse the markers owner resolution and are optional: a track with no markers just shows times.

### Decision 18: Punch ranges are set up on the waveform, and are the last slice

A punch range is an in point and an out point, and records only between them. It is set up in a sheet reached from the strip's `Record` split button (`Record now` or `Record between…`), with the waveform at the top so the points are seen where they fall:

- **Setting a point:** drag the `In` and `Out` handles on the waveform; tap a marker flag to snap `In` (first tap) or `Out` (second tap); pick `In` or `Out` from marker chips; or type a time and nudge it by 100 ms or 1 s. Handles snap to markers and loop ends within a few pixels, and the sheet shows the nearest marker names.
- **Shortcuts:** `Use active loop` fills both points from the loop (and makes it a loop recording); `Use current position` sets `In` to the playhead.
- **Pre-roll:** a stepper (0 to 10 s, default 3 s) sets how far before `In` playback starts when armed, so the singer hears the lead-in.
- **Arm:** shows the range on the waveform and arms the strip. Pressing play (or `Play from pre-roll`) seeks to `In` minus the pre-roll and plays; a countdown shows `Recording in 3, 2, 1` and the recording begins at `In`; it ends at `Out`, and the strip shows the remaining time. `Stop` or `Disarm` works at any time, and playback continues or stops past `Out` according to a `Keep playing after Out` switch.

The first sample lands within the same tolerance as manual starts because the in point is evaluated on the same position tracking as the timeline. Since manual start and stop and loop recordings already exist, punch ranges only add automatic triggers, so the slice can be cut without leaving a gap.

### Decision 19: Auto-export copies recordings to Drive in the background

A setting, `Auto-export recordings to Drive` (off by default), copies each new recording to Drive without a prompt. Turning it on asks for the `drive.file` write permission once, offers a dedicated folder (default `Choir Recordings`, created in My Drive if it does not exist, or any folder the user picks with the existing destination step), and a choice of what to export: `Recording only`, `Mix`, or `Both`. The save sheet shows the state (`Auto-export is off · Turn on…`, or what will be uploaded and where).

- **When:** after a recording is saved, a background queue exports it when a Drive session and a connection exist, retrying later when they do not. A mix export also needs the original (Decision 13); if it cannot be fetched, the mix is marked failed with the reason and the recording alone still goes.
- **What is exported:** the same files as manual export (Decision 12), named from the metadata, with the mix at the default balance and the compensation and nudge the recording had when saved. A later nudge or balance change does not re-export; the user can export again by hand.
- **Status and idempotence:** each recording stores its exports (kind, file id, folder, time) and shows `On Drive`, `Upload pending`, or `Upload failed` with a `Retry`. An export is never repeated for the same kind, and renaming a recording does not rename the Drive file.
- **Deleting:** deleting a recording never deletes its Drive copies.
- **Connection (Wi-Fi):** an `Upload over` setting, `Wi-Fi only` (the default) or `Any connection`. Browsers expose the connection type only partly: the Network Information API reports `wifi`, `ethernet`, or `cellular` in Chrome on Android, and Safari and Firefox do not implement it, with desktop usually unknown. So uploads wait only when the browser reports a cellular connection; when it reports Wi-Fi or ethernet they run, and when it cannot tell they run on any connection. The setting row and the first-time explanation say this in words (`This browser cannot tell Wi-Fi from mobile data, so uploads run on any connection`), so the default is honest rather than a silent no-op. The native build can use real network information later.
- **Settings change:** changing the folder or the kind applies to new recordings; a `Back up existing recordings` action exports the ones that are not yet on Drive.

Alternatives: auto-export only after wifi; deferred (a setting later). Export on a schedule; rejected as slower feedback for a one-off action. Make Drive the home of the recording; rejected: the device copy stays the source of truth and export is a copy.

### Decision 20: Recording length is limited by free storage and shown like a memory card

There is no fixed maximum length. The limit is the storage the browser will give this site, read from `navigator.storage.estimate()` (quota minus usage) less a reserve (`RECORDING_STORAGE_RESERVE_BYTES`, initially 50 MB) kept for metadata and the app's other stores. Recording time left is that remaining space divided by the recording's byte rate (sample rate × 2 bytes).

- **Shown only when it matters (approved in the mock review):** there is no readout while plenty of space is left. Under 30 minutes left the strip shows `About 25 min left`, before recording and while recording (beside the elapsed time). Under five minutes it changes to a warning style. If less than a minute is left, recording is refused with a message that says why and points to the Recordings total in Settings, where recordings can be exported and deleted.
- **While recording:** the readout, once shown, counts down, re-read at every chunk write because other tabs and downloads also use space. When none is left the recording stops, keeping everything written, with the reason `Storage is full`.
- **Honest wording:** browsers report quota coarsely (some round it, some reserve a share of the disk), so the text says `About` and the hard stop remains a failed write (`QuotaExceededError`), which is handled exactly like running out.
- **No estimate available:** where `estimate()` is missing the strip shows no remaining time and the recording runs until a write fails.
- **Format ceiling:** a 16-bit WAV cannot exceed 4 GiB (about thirteen hours of mono at 44.1 kHz). The recording stops there with its own reason; the readout never promises more than that.

The mix export and the overlay do not hold a long recording in memory: the mix is rendered and encoded in chunks (Decision 12) and the overlay decodes by window (Decision 5). Alternative: a fixed ten-minute cap, rejected because a full movement can run longer and the cap was a guess rather than a measurement.

### Mock review (task 1.5)

The design mock (`design-source/recording-mock.html`) was reviewed and approved as is on 2026-11-01: the Recording tool row, the strip, `More actions → Recordings`, the locked context, the punch-range sheet, the Library Recordings view, playlists and queue, Settings and offline files, and the export dialog. The review added the low-space states (ready under 30 minutes left, recording under five, refused, `Storage is full`) and corrected the first-run note to say recordings are never removed automatically.

## Risks / Trade-offs

- [The device store fills up or the browser clears site data] → Persistent storage requested, the used total shown, failed writes reported without losing what was captured, export and auto-export as the way to keep a copy elsewhere.
- [Auto-export to Drive fails or the mix cannot be rendered in the background] → A queue with retry and visible status; the recording alone is exported first; a failed mix does not block it.
- [The overlay starts slowly when the track is not cached] → Spike 1.3 measures it; the track's existing caches are the performance layer, and a cache is added only if the measurement requires it.
- [Wi-Fi-only cannot be enforced in most browsers] → Best-effort with an honest explanation; any connection when unknown.
- [A mix drifts from what was exported earlier] → The mix is a pure function of metadata, recording, and original at a content version, with an engine version tag and a golden-signal test.
- [Mix render is slow or memory-heavy for long recordings] → Chunked render with Int16 encoding, progress and cancel; spike 1.4 measures a ten-minute mix with a shaped track and times a longer one.
- [Offline SoundTouch output differs from the live graph] → Spike 1.4 compares a render with a live capture; accept small differences, document them.
- [Large uploads fail partway] → Resumable upload with retry from the last chunk.
- [The original track changes or is gone] → `Original track changed` warning, overlay against the current file with the sync control, recording alone and export still available.
- [Clock anchors are noisier than expected] → Spike 1.1 measures it; fall back to routing the element into one context.
- [Browser latency values are wrong, especially Bluetooth] → A quick nudge that can be saved as the device default; opt-in click calibration; the default is labelled as an estimate.
- [Loopback calibration is awkward for headphone users] → It is opt-in and never required; the nudge is the main path.
- [Users want to hear a recording at another speed] → Not supported by design; the mix export plus the ordinary track controls covers it.
- [The timeline must be right across pauses, seeks, and loop wraps] → Spike 1.1 includes these; the lookup is pure and specified with synthetic timelines.
- [Drift or clicks when rescheduling] → A tolerance, a short crossfade, and reschedule on every transport event; checked live.
- [Memory growth during long recordings] → Int16 conversion on arrival and chunked writes while recording, so memory stays at one chunk; the limit is free storage (Decision 20).
- [The storage estimate is coarse or wrong] → Wording says `About`, the readout is re-read at every chunk, and a failed write is handled as running out, with everything already written kept.
- [A long recording cannot be decoded whole for the overlay] → The voice decodes a window at a time ahead of the playhead; measured in the 7.1 and 9.1 checks.
- [A very long mix is slow to render] → Chunked render with progress and cancel; spike 1.4 times a long mix.
- [Storage quota or eviction by the browser] → Request persistent storage when the first recording is saved, show sizes and time left, and report write failures as a stop reason with the written chunks kept.
- [Visibility rules for loops and adjusted tracks are easy to get wrong] → One pure model decides where every recording is listed, specified with synthetic libraries (a loop on an adjusted track, a deleted adjusted copy, a session adjustment).
- [Scope is large] → The tasks put the sync and latency spikes first, and punch ranges last, so the plan can be cut back before UI work begins.

## Migration Plan

New database and new package; nothing existing is migrated. The `PcmSource` change is additive (an optional `onBlock`), and the pitch pipeline keeps using frames. Rollback is removing the tool row and the Library view; stored recordings stay in their own database and are harmless.

## Open Questions

- Is a 50 MB reserve and a five-minute warning right, and how accurate is `storage.estimate()` in Safari and Firefox? Chrome 152 (desktop, embedded) reported a 6.5 GB quota with almost nothing used, about twenty hours of 44.1 kHz mono. Task 3.7 measures the other browsers.
- Does Safari honour `getOutputTimestamp` and `outputLatency` well enough, or does it need the manual path as its default?
- Should a playlist recording play over its track at the saved balance only, or may a playlist entry choose recording-only?
- After the last recorded pass of a loop recording, is silence right, or should the recording repeat or the last pass hold?
