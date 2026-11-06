## Why

Choirs rehearse from part tracks: a track with one voice louder, or a mix with one part left out. Directors often have the isolated stems (Soprano, Alto, Tenor, Bass, a piano guide) but the app can only play one audio file at a time, so a singer cannot hear everyone except their own part, or their own part a little louder than the rest, without someone rendering a new file for each case. `rehearsal-recording` has just built the pieces this needs, a framework-agnostic mixer (`@org/audio-mixing`) with a sync controller, gain mapping, windowed voices, a limiter and an offline renderer, so playing several stems as one track is now mostly a matter of using them for a set of stems instead of a take.

## What Changes

- Add a **composite track**: a library item that references two or more existing library tracks (stems) and a mix. It stores references, never copies of audio. It plays anywhere a track plays: the Library, Recents, search, playlists, the queue, the mini-player and the playback screen.
- **Making one:** the user selects tracks in the Library, and `Make composite…` is one bulk action beside `Add to playlist`, `Queue` and `Keep offline`. It is only emphasised, with a note, when every selected track has the same length. Each stem gets an explicit, editable name. The default is a best-effort guess from the track name (so `Ubi caritas · Soprano` becomes `Soprano`), falling back to the track name; tags are not read.
- **Alignment:** all stems start together at 0, the composite is as long as its longest stem, shorter stems are padded with silence, and a stem can have an offset in milliseconds. The create sheet warns when lengths differ.
- **Live mixer on the playback screen:** a collapsible `Mix` panel with a row per stem (mute, solo, volume from 0 to 150%), a presets menu (`All parts`, `Without <my part>`, `<My part> louder`, and presets the user saves), and `Save as preset`. Mix changes are a session mix until saved. Solo and mute follow the usual mixer rules; the waveform follows the mix.
- **One shaped output:** the stems are summed and the sum is shaped as a whole, so speed and pitch apply to the mix and not to each stem; a limiter guards the sum.
- **Loads, then plays:** one loading state shows progress per stem and playback starts only when every stem is ready, so the mix never changes while the user sings. A stem that cannot be loaded is flagged and skipped, with a way to re-link or remove it.
- **Memory is not a hard limit.** When the decoded stems fit comfortably the composite plays from memory. Otherwise its stems are prepared once into local storage and played a window at a time (the way the recording overlay plays a take), with a longer first load and a quick open after. The only hard stop is storage on the device, and its message leads with freeing space (a `Clear offline files` button) before changing the composite.
- **Loops, markers, lyrics, sheet music:** a composite owns its loops and markers, which are positions in the shared audio time. Its sheet music is combined from every stem's sources with duplicates removed (and sheet music can be added to the composite itself); its lyrics are read from the stems, with a picker when more than one stem has them.
- **Export the mix:** the current mix and shaping rendered to a 16-bit WAV through the recording export dialog and destinations (download, or new Drive files).
- Extend `@org/audio-mixing` with the stem-set model (names, offsets, mute and solo resolution, gains) and a multi-source render; the Web Audio graph and worklet wiring stay in the app.
- Record the decision to prototype the engine first: summing and shaping several windowed stems, and routing a non-media-element source through the playback controller, are spikes before any UI task.

Not in this change: native iOS and Android (handed to `native-playback-follow-ups`), syncing composites between devices (the record is local, like adjusted tracks), compressed export formats, stems of different tempo, and a `focus` mode that pre-renders the stems the user is not adjusting into one cached bed (recorded as a later optimisation in the design).

## Capabilities

### New Capabilities

- `composite-tracks`: the composite as a library item and where it appears, making one from selected tracks, stem names, alignment and offsets, missing stems, and what a composite owns or reads from its stems (loops, markers, lyrics, sheet music).
- `composite-mixing`: the live mixer, mute, solo and gain rules, presets and the session mix, one shaped and limited output, the waveform, loading and sync, and following the transport (play, pause, seek, loop wrap).
- `composite-storage`: playing from memory or from prepared stems, the first-load behaviour, the storage stop and its mitigations, and how prepared stems relate to offline files and Clear all.
- `composite-export`: exporting the current mix to a WAV on the device or in Drive.

### Modified Capabilities

- `multi-selection`: the Library bulk-action bar gains `Make composite…`, with the equal-length emphasis.
- `offline-audio-caching`: `Clear all` on the offline files view also clears prepared composite stems, and the view lists them.

## Impact

- `packages/mobile-rehearsal-player`: new `library/composite/` (record, creation flow, mix panel, stem options, presets, missing-stem handling, engine, prepared-stem store), `library/playback/` (a composite-aware player behind the existing player interop, composite items in the controller, shaping on the sum), Library list rows, filter and bulk bar, playlist and queue item rendering, lyrics and sheet music views, offline files view and Clear all, and the export dialog (reused).
- `packages/audio-library-models`: a `CompositeTrack` record and helpers (stem names, alignment and offsets, mute and solo resolution, presets, the sheet-music union, owner resolution for loops and markers).
- `packages/audio-mixing`: stem-set model, per-stem gain, and a multi-source `renderMix`; the windowed voice gains a playback rate for shaped playback.
- Storage: a new local store for prepared stems on web (a cache, rebuildable, cleared with offline files); the composite record joins local library storage like adjusted tracks.
- Dependencies: none expected (SoundTouch and the mixing package are already in the repo).
- Docs: README and CLAUDE.md (workspace layout notes), `docs/mobile-cross-platform-audio-playback.md` (the composite engine path).
- Related: `rehearsal-recording` (shared mixer, limiter, export dialog), `native-playback-follow-ups` (native composite playback).
