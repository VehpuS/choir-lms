## Why

Playing the same Drive file again always downloads it again: on web every `add()` fetches the whole `alt=media` response into a fresh blob and the next `reset()` revokes it. Loop previews, loop and track starts of one file, and reloads each repeat a 3-8 MB download. The first plan (a size-capped cache so replays stay warm) was raised during `nocturne-visual-system-and-playback-shaping` as items 8.37 and 8.43. The user decided on 2026-10-12 to plan it as its own change and to aim further than a replay cache: supporting offline caching for long-term offline playback. On 2026-10-19 the user also moved offline use of opened sheet music here (from `lyrics-lookup-and-saving` 15.2), so a singer who keeps a track offline has its score too.

## What Changes

- A persistent audio cache keyed by `driveFileId` plus Drive content version (`modifiedTime`), shared by web and native, with an explicit size budget, eviction and a way for the user to see and clear what is stored.
- Offline playback of cached tracks, loops and adjusted items without a Drive session, including how the app tells the user a file is available offline.
- One download per file at a time (concurrent requests share it), and waveform analysis that reads the cached bytes instead of fetching again, so files that were never played can get a waveform (was 8.43).
- A decision on which tracks are kept offline: automatically (recently played), by choice (a `Keep offline` action), or both.
- Sheet music offline: a track's opened score files (a Drive PDF, MusicXML or MIDI file) follow the same offline model as its audio, with the same budget and sign-out handling and an offline state in the viewer's source switcher. Linked pages such as MuseScore cannot be cached and say so. Whether score files share the audio cache or are kept with the track is a design question (they are small next to audio).

## Impact

Not scheduled. Needs a design (storage per platform, quota behavior, Drive version invalidation, sign-out handling for cached private audio and score files) and spec deltas before implementation. See `tasks.md` for the original notes.
