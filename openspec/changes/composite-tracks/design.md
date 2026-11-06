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
- Not treat memory as a hard limit: composites larger than memory play from prepared storage.
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

A `CompositeTrack` record (in `audio-library-models`, stored in local library storage like adjusted tracks) holds an id, a name, `stems: { id, trackId, name, offsetMs, mine }[]`, a default mix, saved presets, sheet music added to the composite, the last lyrics stem, and creation time. It stores references (library track ids), never audio. A composite becomes a `PlayableItem` of a new kind beside track, loop and recording, so queue, playlist and mini-player code that already branches on item kind handles it in one new case.

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

### Decision 9: Playback is tiered: memory when it fits, prepared storage when it does not

Decoded audio is large: 3:25 of stereo float is about 72 MB per stem, so a four-stem composite is about 290 MB and nine stems about 650 MB. Memory is not treated as a hard limit.

- **Prepared stems:** each stem is decoded one at a time and written to a local store as 16-bit PCM in chunks (like recording audio), as mono when both channels are identical, resampled to the context rate. About 36 MB per stereo stem for 3:25, half that for mono. This is the path that works for any size: memory is a few windows per stem and storage is N stems.
- **In memory:** when the decoded size fits comfortably, the stems are decoded to `AudioBuffer`s and played directly, which makes seeks and loop wraps immediate and needs no store.

The app picks the tier at load from an estimated decoded size against a budget; the rule and numbers come from spike 1.3 (`navigator.deviceMemory` is Chrome only, so it cannot be the only signal), and the first rule is deliberately conservative. Tasks build the prepared path first, because it is needed regardless; the in-memory path is added only if the spike shows its faster open is worth a second voice implementation.

Prepared stems are a cache: rebuildable from the stems' tracks, listed in the offline files view, and cleared by `Clear all` (Decision 12). The first play of a composite that needs preparation shows `Preparing stems · first time only`; later opens read the store.

The summing happens at playback, but the inputs must stay separate in storage because the sum depends on the live gains, mute and solo. A later optimisation could pre-render the stems the user is not adjusting into one cached bed (a `focus` mode), so a preset like `Bass louder` needs about two streams instead of N; it costs a render on first use and again when those levels change, so it is not part of this change.

_Alternative: one path, always from prepared storage._ Simpler, but every first open of even a small composite pays the preparation time. Kept as the fallback if the spike shows the in-memory path is not worth it.

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
- [Memory estimates are unreliable across browsers] → prepared storage works for every size, so a wrong tier choice costs a longer load, not a crash; the first rule is conservative.
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

- The tier rule: the budget and the signal (decoded-size estimate against a fixed conservative budget, `deviceMemory` where present, or a measured allocation test). Decided by spike 1.3.
- Speed on the sum: source `playbackRate` with pitch compensation or the SoundTouch tempo parameter. Decided by spike 1.2.
- Whether the in-memory path is worth building at all once the prepared path exists (task 1.3's first-open timing).
- The tolerance at which differing stem lengths warn (one second is the starting value).
- Exact wording of the offline files group and the first-play explanation (tasks 8.x, 5.x).
