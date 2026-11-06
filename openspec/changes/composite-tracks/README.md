# composite-tracks

Composite practice tracks: play several isolated stems together, each with its own volume, as one track. Example: Soprano, Alto and Tenor stems played together make a bass practice track with no bass, or with a softer bass stem. Drafted 2026-10-27 as notes; explored and decided on 2026-11-05 and 2026-11-06, and now written up as `proposal.md`, `design.md`, `specs/` and `tasks.md` (the decisions below are the record of that exploration, and the design supersedes this file where they differ).

## The idea

- A **composite track** is a saved item that references two or more existing saved tracks (stems) and a mix: a volume per stem, plus mute and solo. Stems are normal library tracks; the composite stores references, not copies of audio.
- Typical uses: a part-minus-one practice track (everything except my part), my part louder than the others, or all other parts softer so the singer hears their own line.
- Mix presets worth considering: `Without this part`, `This part louder`, and a user-saved mix.
- A composite behaves like other practice items where it can: loops, markers (positions are in the shared audio time, so the stems must be the same length and aligned), playback shaping (speed and pitch applied to the whole mix), and sheet music.

## Reuse with the recording overlay

`rehearsal-recording` also needs to play a take together with the original track and balance the two. That is the same problem as mixing stems: several audio sources played in sync with individual gain. The mixing logic (a mixer with per-source gain, aligned start offsets, and shared transport) should be designed once and used for both stems and takes. It would also support an **export** of the mixed result: a rendered mix of the stems, or of a take over the original, saved as a new audio file. Decide in whichever change comes first where the shared mixer lives so the other can reuse it.

**Update (2026-11-04):** the mixer now exists, as `@org/audio-mixing`, built by `rehearsal-recording`. It has the alignment math, a sync controller against small `Transport` and `Voice` interfaces (the web `Transport` follows the track's media element, and a `Voice` plays one source through Web Audio), the balance-to-gain mapping, and an offline `renderMix` with a SoundTouch `TrackStretcher`, all with injected clocks. Stems can reuse the controller with one `Voice` per stem and the gain mapping per stem, and the offline renderer is the starting point for exporting a composite. What it does not do: it has no notion of several tracks as one item, per-stem mute or solo, or shaping applied to a sum (the stretcher shapes one track). See `docs/mobile-cross-platform-audio-playback.md`, the Recording Overlay section.

## First observations (not verified in depth)

- **Playback engine:** playback uses `react-native-track-player`, which plays one item at a time. Playing several stems at once cannot be a queue of tracks; it needs a mixing path of its own. On web that is Web Audio (the same engine the piano uses), with the stems decoded or streamed into separate gain nodes and one transport that keeps them in sync through play, pause, seek and speed changes. This is the main design question and the main risk (sync drift, and how the existing waveform, loops and shaping follow a mixed source).
- **Shaping:** speed already preserves pitch and pitch shifting runs through a SoundTouch worklet on web, so the mix should be shaped as a whole after summing rather than per stem.
- **Model:** the nearest existing shape is the adjusted track, a `DriveAudioSource` with `adjustment.sourceRef`. A composite is a different kind of item (several references and a mix) and probably needs its own record and owner-resolution rules, like markers and lyrics use.
- **Alignment:** stems must start together. Stems of unequal length or with offsets need a defined rule (pad with silence, or store a per-stem offset).
- **Waveform:** a composite needs a peaks strategy: a sum of the stems' peaks as an approximation, or peaks computed from the mix.
- **Export:** rendering a mix to a file needs an offline render path and a destination (device download on web, Drive); it is the part shared with the recording overlay export.
- **Native:** deferred to `native-playback-follow-ups`; a native mixer is a larger question than the web one.

## Decisions (2026-11-05)

Settled in the exploration session; these feed the proposal, design and specs.

1. **Item shape:** a composite is a library item with its own record, row and menu, playable and queueable like any track. It references stems by id, like an adjusted track references `sourceRef`.
2. **Creating one (revised 2026-11-06):** the user multi-selects library tracks, and **Make composite** is one bulk action beside Add to playlist, Queue and Keep offline. It is only visually emphasised, with a note, when every selected track has the same length. Each stem has an explicit **name**, editable in the create sheet and later. The default is a best-effort guess from the track name (the voice-section word patterns, so `Ubi caritas · Soprano` becomes `Soprano`); a name that matches no part or several parts, or no match at all, falls back to the track name. Tags are not consulted. Names are plain text, not tags.
3. **Mix storage:** the composite stores a default mix and named presets. Tweaks while playing are a session mix (like speed and pitch) with "Save as preset". "Without my part" is derived from the user's part preferences; "My part louder" is the other built-in preset.
4. **Content ownership (revised 2026-11-06):** the composite owns its loops and markers. There is no reference stem. **Sheet music** is combined from every stem's sources with duplicates removed (a file shared by several stems appears once, and shows which stems use it); sheet music can also be added to the composite itself. **Lyrics** are read from the stems; when more than one stem has lyrics the lyrics view shows a picker, and with one it shows no picker.
5. **Alignment:** all stems start together at 0, the composite length is the longest stem, shorter stems are padded with silence, and an optional per-stem offset (ms) is stored. The create flow warns when lengths differ by more than a threshold.
6. **Web playback:** a Web Audio mix with one clock. Stems are decoded into separate gain nodes and summed, and the sum is shaped (speed and pitch through the SoundTouch worklet) as a whole. The composite sits in the existing playback state so the mini-player, queue and loops work. A second engine beside the media element is the accepted cost.
7. **Waveform:** peaks cached per stem and combined with the current gains, so the waveform follows the live mix.
8. **Persistence:** local library storage like adjusted tracks; no Drive sidecar, so a composite does not follow the user across devices.
9. **Missing stems:** the composite plays the stems that are available and shows a "Stem missing" row to re-link or remove. A composite with no available stems is shown as unavailable.
10. **Export (in the first slice):** reuses the recording export dialog and destinations (download or Drive, resumable upload, limiter), rendering the current mix and shaping to 16-bit WAV. No compressed formats.
11. **Package:** extend `@org/audio-mixing` with stem-set types, per-stem mute and solo resolution, the gain model, offset and padding rules, and a multi-source render. The Web Audio graph and worklet wiring stay in the app.
12. **First slice:** web playback with the live mixer, presets, and export. Native stays deferred to `native-playback-follow-ups`.

13. **Solo and mute:** any number of stems can be soloed; when any stem is soloed, only soloed and unmuted stems sound; mute wins over solo on the same stem. Each stem has a volume from 0 to 150% (default 100%), so a quiet stem can be boosted; the existing limiter guards the sum.
14. **Stem limit (revised 2026-11-06):** there is no fixed stem count, and memory is not a hard limit. Playback is tiered: when the decoded stems fit comfortably in memory they play from memory; otherwise they are prepared once into local storage and played a window at a time, as the recording overlay already does (`createWindowedVoice`, `createWavWindowReader`), so memory use stays bounded by a few windows. A composite that needs the second path says so in the create sheet and on first play (a longer first load, quick after). Nothing is said about memory when nothing is wrong. The one hard stop is storage on the device, because prepared stems are stored. The message gives no counts and leads with freeing space, ahead of changing the composite: a **Clear offline files** button that opens the existing Clear all confirmation of the offline files screen (it includes kept files and leaves recordings alone), then exporting and deleting recordings in Settings, and last removing stems or choosing shorter tracks. Prepared composites are a cache and can be rebuilt, so they are cleared with the offline files. Stems are summed on playback but must stay separate in storage, because the sum depends on the live gains, mute and solo: the prepared composite is N stems (about 36 MB each as 16-bit stereo for 3:25, half that for mono), memory is a few windows per stem, and removing a stem shrinks storage linearly. Mono or identical-channel stems are prepared as mono. Later optimization, not in the first slice: a "focus" mode that pre-renders the stems the user is not adjusting into one cached bed, so a preset like Bass louder needs about two streams, at the cost of a render on first use and a re-render when those levels change. The signal that picks the tier is a design decision.
15. **Library presence:** composites appear in Recents, search, playlists and the queue like tracks, with a "Composite" badge and a stem count; the Library has a filter for them. Stems stay listed as normal tracks.
16. **Loading:** load all stems, then play, with one loading state showing "n of N stems ready" (or "Preparing" for a large composite's first play). An unavailable stem is flagged and skipped. Playback starts only when every stem is ready, so the mix never changes mid-listen.

## Still open

- The UI mock is drafted at `design-source/composite-mock.html` (library row and filter, select and create flow, memory limit, loading, mixer panel with presets, solo, collapsed, save preset, stem options, missing stem, export) and awaits review and approval.
- The runtime tier signal (design): how the app decides between in-memory and windowed playback (`navigator.deviceMemory` is Chrome-only; a decoded-size estimate against a conservative budget is the likely rule), and the format and store of the prepared stems (16-bit PCM like recordings, in the existing local store).
- Seek and loop wrap from windowed stems: a window must be ready before a loop wrap, so loops need read-ahead at the loop start, which the recording overlay already does.
- Where sheet music added to a composite is stored (on the composite record) and how it is ordered against the stems' sources.

## Questions for later (original draft, now mostly answered above)

1. Is a composite a library item with its own row and menu, or a mode of the playback screen applied to a track and its sibling stems?
2. How are stems grouped and labelled (tags, a folder, a naming convention, or explicit assignment when the composite is made)?
3. How does a user create a composite: pick tracks, or start from a track and add stems?
4. Where do per-stem volumes live: on the composite (saved) or as an ephemeral session mix (like playback shaping) that can be saved?
5. What happens to loops, markers, and lyrics on a composite: inherited from one chosen stem, or its own?
6. Does the mixing logic live in a new framework-agnostic package, and is the web engine shared with the piano's Web Audio code?
7. Export: format, destination, and whether it is part of the first slice.
