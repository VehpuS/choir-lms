## Context

The app plays one audio file at a time. On web that file is a media element owned by `react-native-track-player` (Shaka underneath), reached through `getSavedTrackPlayer()`; the playback controller (`saved-track-playback-controller/runtime-core.ts`, `runtime-commands.ts`) calls that one player for load, play, pause, seek, volume, rate and position. Speed is the element's `playbackRate` with `preservesPitch`; pitch runs the element through a SoundTouch AudioWorklet (`web-pitch-shifter.web.ts`). Authenticated Drive audio is fetched whole and replayed as a blob URL, so a track starts only when its download finishes.

`rehearsal-recording` has since built what a stem mixer needs, in `@org/audio-mixing`: balance-to-gain mapping, a sync controller against small `Transport` and `Voice` interfaces, `createWavWindowReader` and `createWindowedVoice` (which play a WAV a window at a time so a long recording is never held decoded), a SoundTouch `TrackStretcher`, `renderMix` (an offline mix in chunks), and a mix limiter. That package follows an external transport (the track's media element) and plays one extra voice against it. A composite has no external clock: there is no single file to hand to a media element.

Other facts that shape the design:

- Adjusted tracks are `DriveAudioSource` records with `adjustment.sourceRef`; lyrics, markers and sheet music of an adjusted track are read from the source through owner resolvers, never copied. A recording is a separate record that becomes a playable item (`createRecordingPlayableItem`) and a playlist entry kind. A composite follows the recording precedent for items and the adjusted-track precedent for local storage.
- Sheet music is a list of `SheetMusicSource` links per track (at most 10 per track, de-duplicated with `uniqBy`); lyrics are one text per track. Part names are already classified from score parts by the voice-section word patterns (`voice-section.ts`), and the user's parts are stored as part preferences (`part-preferences.ts`). Nothing today classifies a track name.
- The offline files view already has `Clear all` (with its own confirmation, including kept files, leaving recordings alone), and recordings already use chunked WAV storage in their own IndexedDB store.

The design mock (`design-source/composite-mock.html`) covers every screen below and was reviewed with the user on 2026-11-06; the revisions from that review are in the decisions.

## Goals / Non-Goals

**Goals:**

- Play two or more stems together as one library track, with a volume, mute and solo per stem, and a presets menu, on web.
- Keep the stems exactly together through play, pause, seek, loop wrap and speed and pitch changes.
- Shape the sum once (speed and pitch), and keep the sum from clipping.
- Make composites ordinary items in lists, playlists and the queue, with loops and markers of their own and lyrics and sheet music taken from the stems.
- Not treat memory as a hard limit: every composite plays from prepared storage.
- Export the current mix to a WAV file.
- Reuse `@org/audio-mixing` and the recording export dialog rather than building a second mixer.

**Non-Goals:**

- Native iOS and Android (`native-playback-follow-ups`).
- Syncing composites between devices; the record is local.
- Per-stem pan, effects, EQ, or stem tempo; all stems share one timeline.
- Compressed export formats.
- Rendering a composite to a library track automatically (the user can export the mix and add the file).
- Pre-rendering a cached bed of the stems the user is not adjusting (a possible later optimisation, noted in Decision 9).

## Decisions

### Decision 1: A composite is a library record that references stems, and a playable item of its own

A `CompositeTrack` record (in `audio-library-models`, stored in local library storage like adjusted tracks) holds an id, a name, `stems: { id, trackId, name, offsetMs, mine }[]`, a default mix, saved presets, sheet music added to the composite, the last lyrics stem, and creation time. It stores references (library track ids), never audio. A composite becomes a `PlayableItem` of a new `composite` kind beside track and loop (a recording stays a track item with `recordingId`), so queue, playlist and mini-player code that already branches on item kind handles it in one new case.

A composite must have at least two stems when created. Removing stems down to one asks to delete the composite instead. Deleting a composite deletes none of its stems.

_Alternative: a "stems" mode of the playback screen for a track with sibling files._ Rejected (README decision 1): it cannot be queued or put in a playlist, and loops would have nothing to attach to.

### Decision 2: Stem names are explicit; the guess is best effort and only reads the track name

Each stem has a plain-text name the user can edit when creating and later. The default comes from a pure `guessStemName(trackName)` that reuses the voice-section word patterns (`soprano`, `alto`, `tenor`, `bass`, and so on); one match gives that section's label (`Soprano`), no match or several matches (the existing classifier already treats a name that names several sections as no match) fall back to the track name, so a `piano guide` stays `piano guide`. Tags are not read; they are free-form and often not about the part.

`mine` marks the stem that is the user's part, used by the `Without <part>` and `<Part> louder` presets. It is set automatically when the stem name classifies to a section in the user's part preferences, and the user can switch it per stem. With no `mine` stem, those two presets are not offered.

_Alternative: tags as the source of part names._ Rejected: a track can carry several tags and nothing says which names the part.

### Decision 3: Alignment is "start together, pad, with optional offsets"

All stems start at composite time 0. A stem's `offsetMs` shifts it later (positive) or earlier (negative, trimming its start). The composite's length is the longest `offsetMs + stem duration`; shorter stems end in silence. The create sheet warns when stem durations differ by more than a small tolerance (one second to start; the spike confirms), and the stem options sheet edits the offset. Stem durations come from the same duration probing playback already uses; a stem whose duration is not known yet blocks creation until it is.

Loop and marker positions are composite time (the shared timeline), so they stay valid when a stem is replaced by one of the same alignment.

### Decision 4: The composite is its own Web Audio engine with one clock, not a follower of a media element

The engine is a graph in one `AudioContext`: per stem a voice into a stem gain, all into a sum bus, then the SoundTouch pitch node when pitch is not 0, then the limiter, then a master gain and the destination. The `AudioContext` clock is the one clock. To play from position p, the engine schedules every stem's voice at the same context time with the same offset; each stem's windows are then scheduled in context time, so the stems cannot drift from one another by construction. This is why the sync controller is not used for stems: it exists to follow an external transport, and here there is none. The pieces reused from `@org/audio-mixing` are the windowed voice and window reader, the gain mapping, the limiter and its worklet, and the render plan.

Speed uses source `playbackRate` on every stem voice with the pitch node compensating, or the SoundTouch tempo parameter on the sum; which one is cleaner for voices and for scheduling windows is decided by spike 1.2. Either way shaping happens once, after the sum.

_Alternative: a hidden media element as the clock, with each stem a voice via the sync controller (the overlay design)._ It reuses more, but needs a real or silent source for the element, and each of 3 to 8 voices then follows it with measured drift correction; with one `AudioContext` clock there is nothing to correct. _Alternative: pre-render a mix and play it as a track._ Rejected: changing a volume would mean re-rendering, which kills live balancing.

### Decision 5: The engine sits behind the existing player interop, so the controller sees one player

The controller, mini-player, queue, loop handling, remote controls and background transport all call `getSavedTrackPlayer()`. On web a composite-aware player wraps that interop: for a composite item it routes load, play, pause, seek, volume and rate to the engine and reports position, duration, state and progress through the same events; for anything else it delegates unchanged. This keeps composite support out of dozens of call sites. Loop wrap uses `createLoopAwareTransport` over the engine's transport. On native a composite item is unavailable with a message.

The risk here is how much of the controller assumes a media element (`getMediaElement()`, duration probing with a muted play, blob URL bookkeeping). Spike 1.1 lists those assumptions before any UI work.

### Decision 6: One shaped, limited sum

Speed and pitch from the playback shaping session apply to the sum, through the engine as the shaping engine for a composite item, so the controls and their locks behave as for a track. The sum goes through the same mix limiter as the recording overlay and the export, without make-up gain, so the live mix and the exported mix agree. Volume per stem is 0 to 150% as a linear gain (100% is 1.0, 150% is 1.5); a stem's own headroom is the limiter's job.

### Decision 7: Mute, solo, presets and the session mix are pure models

`resolveStemGains(stems, mix)` returns a gain per stem: a stem is silent when it is muted, or when any stem is soloed and it is not; mute wins over solo on the same stem; otherwise gain is volume / 100. It lives in `audio-mixing` (with the stem types) and is specced alone. Built-in presets are computed, not stored: `All parts` (everyone 100%), `Without <mine>` (the mine stem muted), `<Mine> louder` (mine 150%, others 70%). User presets and the composite's default mix are stored on the record. The session mix lives in a small store like `recording-mix-store.ts`, starts from the default mix when an item loads, and resets when the item changes; `Reset to the saved default` restores it. Gain changes ramp briefly to avoid clicks.

### Decision 8: The waveform follows the mix from per-stem peaks

Peaks are computed once per stem (from decoded audio at load or preparation) and cached with the stem. The composite waveform combines them with the current gains per column as `sqrt(Σ (gain × peak)²)` clipped to 1: stems are mostly incoherent voices, so adding squares is closer than adding amplitudes. It is an approximation and is labelled as the mix, not a measurement. Recomputing it on a gain change is a cheap pass over precomputed columns.

### Decision 9: Playback is from prepared storage only

Decoded audio is large: 3:25 of stereo float is about 72 MB per stem, so a four-stem composite is about 290 MB and nine stems about 650 MB. Memory is not treated as a hard limit, so every composite plays from prepared stems (spike 1.3 measured an in-memory path and found no faster open worth a second voice implementation).

- **Prepared stems:** each stem is decoded one at a time and written to a local store as 16-bit PCM in chunks (like recording audio), as mono when both channels are identical, resampled to the context rate. About 36 MB per stereo stem for 3:25, half that for mono. Memory is a few windows per stem and storage is N stems.
- The only budget is storage: the needed bytes are estimated before preparing and compared with the browser's storage estimate (task 2.7), falling back to attempting the write and handling the failure.

Prepared stems are a cache: rebuildable from the stems' tracks, listed in the offline files view, and cleared by `Clear all` (Decision 12). The first play of any composite shows `Preparing stems · first time only`; later opens read the store.

The summing happens at playback, but the inputs must stay separate in storage because the sum depends on the live gains, mute and solo. A later optimisation could pre-render the stems the user is not adjusting into one cached bed (a `focus` mode), so a preset like `Bass louder` needs about two streams instead of N; it costs a render on first use and again when those levels change, so it is not part of this change.

_Alternative: also an in-memory path for small composites._ Rejected by spike 1.3: it decodes every stem on every open and needs a memory budget that browsers cannot report reliably. Revisit only if first-open time proves a problem on real devices.

### Decision 10: Loading waits for every stem

Stems resolve through the normal track path (playback cache, offline store, Drive), each one downloaded whole on web. The loading state shows progress per stem, and playback starts when all are ready, so the mix never changes while the user sings. A stem that cannot be loaded (deleted track, not available offline and no session) is flagged `Stem missing` and skipped; the composite plays the rest and the row offers `Re-link` (pick another track) and `Remove`. A composite with no available stem is shown as unavailable.

### Decision 11: Loops and markers belong to the composite; lyrics and sheet music come from the stems

- **Loops and markers:** stored against the composite id, in composite time. Loop and marker code resolves an owner from a track or adjusted copy today; it gains the composite as an owner. Spike 1.1 lists the assumptions that the owner is a `DriveAudioSource`.
- **Sheet music:** the union of every stem's sources plus any added to the composite, de-duplicated by location (Drive file id or URL, as the existing `uniqBy` does), each row noting which stems use it. The cap of 10 applies when adding to a record, not to the union. Nothing is copied.
- **Lyrics:** read from the stems; the view lists the stems that have lyrics, remembers the last pick on the record, and shows no picker when only one stem has lyrics. Editing lyrics from a composite edits that stem's lyrics (the owner), with the stem named.

_Alternative: a reference stem chosen at creation._ Rejected in review: it is one more setting to configure, and the union needs no choice.

### Decision 12: Composites join the library surfaces; offline and storage reuse what exists

- **Lists:** a composite row has a `Composite · N stems` badge in the Library, Recents, search and playlists, with a `Composites` filter in the Library. A playlist entry kind `composite` references the composite id, like the recording kind.
- **Selection:** the Library bulk bar gains `Make composite…` beside the others; it is only emphasised, with a note, when every selected track has the same duration (to within the same tolerance as Decision 3). It needs two or more tracks.
- **Offline:** `Keep offline` on a composite keeps every stem's track offline through the existing track actions, and a composite is playable offline when all stems are stored or prepared. `Clear all` in the offline files view also clears prepared stems, which are listed there as `Prepared composites`.
- **No room:** when preparing or loading fails for storage, the message gives no counts and leads with freeing space: a `Clear offline files…` button that opens the existing `Clear all` confirmation, then exporting and deleting recordings in Settings, and last removing stems or choosing shorter tracks.

### Decision 13: Export renders the current mix through the existing dialog

The `Export…` link opens the recording export dialog with a composite flavour: current stem gains (mute and solo resolved), the current speed and pitch, the limiter, 16-bit WAV, to a download or new Drive files with the resumable upload. The default name is `<composite name> · <preset or Custom mix>.wav`. `renderMix` gains a multi-source mode: stems read through window readers, offsets and gains applied, summed per chunk, then the existing stretcher shapes the summed chunks. Spike 1.4 confirms the stretcher can take a summed stream and measures time and memory for a nine-stem composite. Where a stem is not yet prepared the export prepares it first.

### Decision 14: The mixing model extends `@org/audio-mixing`

Stem-set types, `resolveStemGains`, offset and duration math, and the multi-source render plan go into `@org/audio-mixing` (framework-agnostic, small enough to import statically, depends on `audio-library-models` for the record types). The Web Audio graph, the player wrapper, the stores and the UI stay in the app. The windowed voice gains a playback rate parameter for shaped playback (spike 1.2).

## Risks / Trade-offs

- [Routing a non-media-element source through the controller touches many call sites] → the wrapper at the interop (Decision 5), a written list of media-element assumptions first (task 1.1), and composite playback behind the capability gate until it passes.
- [Shaping the sum may sound worse or schedule badly with windowed voices at a rate other than 1] → spike 1.2 on real voice stems before building UI; fallback is speed-only until pitch on the sum is clean.
- [Browsers cannot report memory or free storage reliably] → memory is bounded to a few windows per stem; the storage estimate may say `unknown`, in which case preparing is attempted and a failure is handled (task 4.3).
- [Preparing stems is slow and uses storage] → one-time per composite, progress and an explanation, rebuildable, cleared with offline files; mono where possible.
- [Whole-file Drive downloads for N stems on a slow connection] → the same progress as a track (per stem), `Keep offline` on the composite, and prepared stems make later opens independent of Drive.
- [Many concurrent windowed voices cost CPU and storage reads] → measured in spike 1.3 with nine stems; windows are read ahead per voice as the recording overlay already does.
- [A loop wrap needs windows ready at the loop start] → read-ahead at the loop start, as in the overlay; spec'd and measured with a short loop.
- [A wrong stem-name guess marks the wrong stem as the user's part] → the `This is my part` switch is visible in stem options and the preset names show which stem they use.
- [Stems that look alike but differ in tempo or edit] → the create sheet warns on length differences only; the user hears it. Out of scope to detect misalignment.
- [Safari and mobile browsers suspend an `AudioContext`] → resume on the play gesture, as the pitch shifter already does.

## Migration Plan

Additive: a `composites` collection in local library storage and a store of prepared stems; older data is untouched, and a build without composites ignores the collection. No rollback step beyond removing the collection. Playlist and queue entries of kind `composite` read as unavailable in a build that does not know the kind, the same way recording entries do.

## Open Questions

- Speed on the sum: decided by spike 1.2 (source `playbackRate` per voice, pitch node rate mirrored).
- The tolerance at which differing stem lengths warn (one second is the starting value).
- Exact wording of the offline files group and the first-play explanation (tasks 8.x, 5.x).

## Spike results

### 1.1 Controller audit (2026-11-07)

The audit lists every place that assumes a media element or a single TrackPlayer track, and what the wrapper of Decision 5 covers. No code changed.

**Covered by wrapping `getSavedTrackPlayer()`** (the wrapper routes a composite item to the engine and delegates everything else): `runtime-core.ts` (`reset`, `add`, `setVolume`, `seekTo`, `play`, `pause`, `getProgress`, `getPlaybackState`), `runtime-commands.ts` (`play`, `setVolume`), `queue-commands.ts` (`pause`, `seekTo` at the end of a queue), `saved-track-playback-remote-controls.ts` (already goes through the controller's commands), `effects.ts` (`getVolume`, the range-end `pause`), `shaping/index.ts` (`setRate` through `getSavedTrackPlayer()`), and the recording call sites that use the player (`punch-instance.ts`, `use-punch-track.ts`, `use-click-calibration.ts`, `recording-overlay-host.tsx`: `setVolume`, `pause`, `getProgress`).

**Not covered by the wrapper, needs its own seam:**

1. **The three hooks.** `useSavedTrackPlayerPlaybackState`, `useSavedTrackPlayerProgress` and `useSavedTrackPlayerEvents` delegate to RNTP's own `usePlaybackState`, `useProgress` and `useTrackPlayerEvents`. These listen to RNTP's event emitter, so a wrapper that only replaces the `default` player object is invisible to them: a composite's position, state and `PlaybackQueueEnded` would never reach the UI. They have to read from a small source that both the RNTP hooks and the engine feed (an `useSyncExternalStore` over "the active engine, else RNTP"). `saved-loop-list-card.tsx` also calls `useSavedTrackPlayerProgress` directly. **Decision 5 is extended: the interop owns a hook seam as well as the player object.**
2. **`getMediaElement()` and blob URLs.** `saved-track-player-web-load.ts` patches `rntp.load` and RNTP's `reset` and `stop` to clear the media element source and revoke blob URLs; `web-pitch-shifter.web.ts` routes the media element into the SoundTouch graph once (`createMediaElementSource` can run once per element) and `recording-transport.web.ts` builds the sync controller's `Transport` from the element. A composite never touches the element, so: the pitch shifter must not be used for a composite (the engine owns its own pitch node, task 3.6), the recording overlay and punch-in features must be unavailable for a composite (they follow the media element's clock; task 3.4 decides the message), and when a composite loads, the wrapper must still call RNTP's `reset` so the previous track's element and blob URLs are released.
3. **Duration probing.** `resolveSavedTrackDurationFromPlayer` (`saved-track-player-runtime.ts`) resets the player, adds the track and plays it muted to read a duration; `resolveSavedTrackDuration` then reloads the active item. For a composite the duration is known from its stems (Decision 3), so the probe must be skipped by an item-kind branch. The stems' own durations still use the probe through the normal path.
4. **`createSavedTrackPlaybackRequest`** builds a Drive media URL from `playableItem.source.driveFileId`, and `loadIntoPlayer` always calls `reset` and `add`. A composite needs its own load branch in `loadIntoPlayer` (resolve stems, call the engine) before this runs.
5. **`PlayableItem` itself.** It requires `source: DriveAudioSource` and `sourceId`, and 15 files read `item.source` (lyrics, sheet music, markers, offline, waveform, library rows). `PlayableItemKind` is `'track' | 'loop'`; **a recording is not a kind, it is a track item with `recordingId`.** The design said "a new kind beside track, loop and recording", which is not how the code is. Options for the composite: (a) a `'composite'` kind plus a synthetic `DriveAudioSource` for the composite (id = composite id, `durationMs` from the stems, no `driveFileId`), or (b) a track item with `compositeId`, as recordings do. This is a data-model decision for the user (see below).
6. **Item-kind branches.** About 50 files branch on `kind === 'track'` or `'loop'` (playlists, selection, recents, markers context, lyrics, sheet music, offline, tags, menus). A new kind makes every `kind` switch either handle it or fall through; with option (b) most keep working unchanged.
7. **Owner resolution.** `getPlayableItemMarkerOwnerId` in `marker-jump-plan.ts` is `source.adjustment?.sourceRef ?? source.id`, and `resolveMarkerOwner` in `track-markers.ts`, `source-lyrics.ts` and `source-sheet-music` use the same adjusted-source idea. With a synthetic composite source (option a) the composite's id is its own owner and markers and loops need no new resolver; lyrics and sheet music need the composite-specific resolvers of Decision 11.
8. **Loop-aware transport.** `createLoopAwareTransport` takes any `Transport` (position, playing, ended, `subscribe`), so it works over an engine transport unchanged. What differs is that on a media element a loop wrap is a seek event; the engine should report `loop` itself when it wraps, so the wrapper does not need the sampling heuristic for composites.
9. **Range end.** `effects.ts` stops loop playback at the range end by polling progress and calling `pause` and `seekTo`; this works through the wrapper as long as the engine's progress is reported at the same poll interval.
10. **Progress gate and load epochs** (`runAsLoad`, `progressGate`) are in the controller, not the player, so they apply to composite loads as is; stem loading must honour the same supersede/abort path (`isSavedTrackDownloadAbortError`).

**Conclusion:** the wrapper covers the imperative calls (about 12 sites). It does not cover the three hooks, the pitch shifter, the duration probe, the media-element recording features, or the data model. Decision 5 stays, with three additions: the hook seam (1), item-kind branches in `loadIntoPlayer` and duration resolution (3, 4), and an explicit "unavailable for composites" for the overlay and punch-in. Tasks 3.4 and 3.5 are updated below.

**Decided (2026-11-07, with the user):** a `'composite'` `PlayableItemKind` with a synthetic `DriveAudioSource` (id = composite id, `durationMs` from the stems, no `driveFileId`). Every `kind` branch listed in item 6 either handles `composite` or falls through deliberately; the composite is its own marker, loop and offline owner through the synthetic source. Decision 1's wording "beside track, loop and recording" should read "beside track and loop; a recording stays a track item with `recordingId`".

### 1.2 Shaping the sum (2026-11-07)

Run in the Browser pane against the app's own SoundTouch processor, with `OfflineAudioContext` renders of four synthetic harmonic "voice" stems (220, 277, 330 and 440 Hz, vibrato, 24 s) played from 5 s windows at 0.7×, 1.0× and 1.3× with pitch 0, ±2 semitones. The spike page was throwaway; nothing was added to the repo.

- **SoundTouch tempo on the sum is not possible here.** The processor exposes only `playbackRate`, `pitchSemitones` and `pitch` (no tempo), and the library documents that its own time-stretcher cannot produce enough output per 128-sample block at tempo changes. In a real-time graph the sources must be fed faster or slower, so **speed is the source `playbackRate` on every stem voice, with the pitch node's `playbackRate` set to the same value and `pitchSemitones` set to the user's pitch** (the processor compensates the rate itself). Decision 4's "or the tempo parameter on the sum" is dropped.
- **Pitch is correct.** At every tested rate and shift the energy sits at the expected fundamental (`f × 2^(pitch/12)`) rather than half a semitone away.
- **Alignment holds by construction.** Impulses placed in two stems across window boundaries (4.999 s, 5.0 s, 9.9995 s, 12.3 s) came out with a lag of 0 samples at all five rate and pitch combinations, because every window of every stem is placed from the same context-time formula (`k × W / rate`).
- **Window boundaries click at some rates.** With 5 s windows and plain butt joints, 0.7× produced a second difference 27 to 35 times larger than a continuous source (1.0×, 1.3× and 0.85× were clean): `W / rate` is not a whole number of samples, so the next window's start is rounded to a different sample than the previous window's end. **Fix: each window carries a 64-sample overlap with the next, baked as complementary linear fades** (fade-out on the tail of window k, fade-in on the head of window k+1, same media samples). With 64 samples the ratio is 1.01 at 0.7×, and 256 and 1024 samples give the same, so 64 (1.5 ms) is the value.
- **The sum can clip.** Four stems at 0.18 amplitude summed to a peak of 1.08 after shaping, so the limiter (without make-up gain, Decision 6) is needed even at 100% per stem.
- **Not measured: how it sounds.** The offline checks measure pitch, clicks and alignment, not artefacts of the pitch node on real voices at 0.7×. The listening check is part of 11.1 with real stems.

**Decision (speed method):** source `playbackRate` per voice plus the pitch node with `playbackRate` mirrored. **What the windowed voice needs for a rate:** a `rate` option; windows scheduled at `anchor + (windowStartMs − fromMs) / (1000 × rate)` with `source.playbackRate = rate`; a 64-sample baked crossfade overlap; and a rate change handled as a re-anchor (stop with the fade, restart at the current media position), like a seek. Task 3.2 is updated.

### 1.3 Voices, memory and first open (2026-11-07)

Run in the Browser pane (Chrome, `deviceMemory` 32, JS heap limit 4 GB) with nine synthetic 4-minute 44.1 kHz stereo WAV stems (about 40 MB each, four of them with channels that differ slightly and five with identical channels). The rows below are what was measured; the page was throwaway.

| Measure                                              | Result                                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Decoded size per stem (float32 stereo)               | 81 MB, so 4 stems about 325 MB and 9 stems about 730 MB (computed; `AudioBuffer` memory is off the JS heap) |
| Decode time per stem (WAV)                           | 93 to 182 ms                                                                                                |
| Prepared size, 16-bit PCM                            | 20 MB per mono stem, 40 MB per stereo stem; 262 MB for the nine                                             |
| Prepare time per stem (decode, convert, store)       | 155 to 199 ms, one stem at a time                                                                           |
| Press play to sound, in memory                       | 0.2 ms to start the sources, after every stem is decoded again (about 150 ms each for WAV)                  |
| Press play to sound, prepared, warm                  | first window of all nine stems read in 12 ms, plus about 38 ms to build the buffers                         |
| Read and build one 30 s window for nine stems        | 13 to 24 ms read, 37 to 38 ms build; the same at a loop start                                               |
| Main-thread long tasks over 12 s with nine voices    | none                                                                                                        |
| Timer lateness while nine voices play (100 ms timer) | not usable: the pane was in the background and timers were throttled to about 1 s                           |

**Findings.**

- **A warm open from prepared storage is as quick as the in-memory path in practice.** The in-memory start itself is instant, but the memory path must decode every stem on every open (about 150 ms per stem for WAV, more for MP3 and M4A), while prepared storage decodes once and then needs about 50 ms to be playing. Memory is no hard limit with prepared storage: only a few windows per stem are ever decoded.
- **A loop wrap is cheap.** Reading and building the window at the loop start costs about 60 ms for nine stems, well inside the 12 s read-ahead; a very short loop needs the loop-start window built before the loop end (task 3.7), which this cost makes easy.
- **Mono detection pays off** for stems that are really mono (half the storage and half the work); it must compare the channels fully, not by sampling, to be exact (the spike sampled every 97th sample, which is enough to measure but not to ship).
- **Not measured:** CPU on a phone, compressed-format decode time (Drive stems are likely MP3 or M4A, so the first prepare is slower than the figures above), and real-time glitching under load (the pane was in the background). The 11.1 browser check covers audible glitches with the pane in front.

**Decision (tier rule):** **prepared storage only.** The in-memory path would add a second voice implementation for a faster first open that the numbers do not show, and it needs a memory budget that browsers cannot report reliably. The only budget is storage: before preparing, estimate `Σ(duration × sampleRate × 2 bytes × channels)` and compare it with `navigator.storage.estimate()` where available, falling back to attempting the write and handling the failure (task 4.3). Task 2.7 becomes the storage estimate and fit check (no tier), and task 4.4 is dropped. Decision 9's "tiered" wording is superseded by this; the user-facing behaviour (first play `Preparing stems · first time only`, quick later opens) is unchanged, and the in-memory path stays an option to revisit if first-open time proves a problem on real devices.

### 1.4 Export render (2026-11-07)

Run in Node 22 against the same `@soundtouchjs/core` `Stretch` and `SoundTouch` stages that `createSoundTouchStretcher` uses, with the pipeline fed from a per-block sum of N synthetic stems instead of a decoded track (the stretcher pulls a stream, so a sum is just a different producer of the input block). 4-minute stems, 44.1 kHz, stereo out. The script was throwaway.

| Case (stems, rate, pitch, block)   | Time for the shaping stages | RSS peak | Output length               | Level (output RMS ÷ input RMS) |
| ---------------------------------- | --------------------------- | -------- | --------------------------- | ------------------------------ |
| 9 stems, 0.7×, +2 st, 4096 frames  | 4.4 s (55× real time)       | 54 MB    | 345.5 s (342.9 s plus tail) | 0.98                           |
| 9 stems, 0.7×, +2 st, 65536 frames | 4.3 s                       | 69 MB    | 345.8 s                     | 0.98                           |
| 4 stems, 1.3×, −2 st, 4096 frames  | 2.6 s                       | 52 MB    | 186.0 s (184.6 s plus tail) | 0.99                           |
| 9 stems, 1.0×, 0 st, 4096 frames   | 2.4 s                       | 51 MB    | 241.9 s (240 s plus tail)   | 0.99                           |

The synthetic stem generator took more time than the shaping (8.5 s for nine stems), so the table gives the shaping stages alone; real stems come from window readers and add the read and sum cost, which spike 1.3 measured at tens of milliseconds per 30 s window.

**Findings.** Shaping a summed nine-stem, four-minute mix costs about 4 s of CPU and stays near 55 MB resident, so the render is dominated by reading and summing the stems, not by the stretcher. Block size barely matters. The summed peak reached 1.83 before the limiter with nine stems at the same level, so the limiter after the stretcher (as `renderMix` already applies it) is required, not optional. Level through the stretcher is preserved to within 2%. The output ends about 2.6 s later than `duration ÷ rate` because the pipeline is flushed with silence, as the stretcher already does; the render trims the tail to the plan's length.

**Not measured:** the comparison with a live capture of the same mix. A live capture needs real-time playback and a listener, and the live and offline paths are different pitch engines (the AudioWorklet and the pure-JS core), so the level and pitch parity check belongs in task 10.1's spec (against a known small case) and 11.1's manual check.

**Decision (chunk size and worker):** **summed in blocks of 4096 frames inside chunks of one second of output, in the main thread, yielding to the event loop between chunks, as `renderMix` does today. No worker.** The CPU cost (about 1.7% of real time for the stretcher) does not justify a worker, and keeping it on the main thread avoids moving the window readers and IndexedDB access. Revisit only if 11.1 shows the UI stalling during an export. Task 10.1 uses these values.
