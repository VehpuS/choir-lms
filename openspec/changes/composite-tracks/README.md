# composite-tracks

Composite practice tracks: play several isolated stems together, each with its own volume, as one track. Example: Soprano, Alto and Tenor stems played together make a bass practice track with no bass, or with a softer bass stem. Drafted 2026-10-27 so it can be picked up later; no proposal, design, specs, or tasks yet, and only a light first look at the code.

## The idea

- A **composite track** is a saved item that references two or more existing saved tracks (stems) and a mix: a volume per stem, plus mute and solo. Stems are normal library tracks; the composite stores references, not copies of audio.
- Typical uses: a part-minus-one practice track (everything except my part), my part louder than the others, or all other parts softer so the singer hears their own line.
- Mix presets worth considering: `Without this part`, `This part louder`, and a user-saved mix.
- A composite behaves like other practice items where it can: loops, markers (positions are in the shared audio time, so the stems must be the same length and aligned), playback shaping (speed and pitch applied to the whole mix), and sheet music.

## Reuse with the recording overlay

`rehearsal-recording` also needs to play a take together with the original track and balance the two. That is the same problem as mixing stems: several audio sources played in sync with individual gain. The mixing logic (a mixer with per-source gain, aligned start offsets, and shared transport) should be designed once and used for both stems and takes. It would also support an **export** of the mixed result: a rendered mix of the stems, or of a take over the original, saved as a new audio file. Decide in whichever change comes first where the shared mixer lives so the other can reuse it.

## First observations (not verified in depth)

- **Playback engine:** playback uses `react-native-track-player`, which plays one item at a time. Playing several stems at once cannot be a queue of tracks; it needs a mixing path of its own. On web that is Web Audio (the same engine the piano uses), with the stems decoded or streamed into separate gain nodes and one transport that keeps them in sync through play, pause, seek and speed changes. This is the main design question and the main risk (sync drift, and how the existing waveform, loops and shaping follow a mixed source).
- **Shaping:** speed already preserves pitch and pitch shifting runs through a SoundTouch worklet on web, so the mix should be shaped as a whole after summing rather than per stem.
- **Model:** the nearest existing shape is the adjusted track, a `DriveAudioSource` with `adjustment.sourceRef`. A composite is a different kind of item (several references and a mix) and probably needs its own record and owner-resolution rules, like markers and lyrics use.
- **Alignment:** stems must start together. Stems of unequal length or with offsets need a defined rule (pad with silence, or store a per-stem offset).
- **Waveform:** a composite needs a peaks strategy: a sum of the stems' peaks as an approximation, or peaks computed from the mix.
- **Export:** rendering a mix to a file needs an offline render path and a destination (device download on web, Drive); it is the part shared with the recording overlay export.
- **Native:** deferred to `native-playback-follow-ups`; a native mixer is a larger question than the web one.

## Questions for later

1. Is a composite a library item with its own row and menu, or a mode of the playback screen applied to a track and its sibling stems?
2. How are stems grouped and labelled (tags, a folder, a naming convention, or explicit assignment when the composite is made)?
3. How does a user create a composite: pick tracks, or start from a track and add stems?
4. Where do per-stem volumes live: on the composite (saved) or as an ephemeral session mix (like playback shaping) that can be saved?
5. What happens to loops, markers, and lyrics on a composite: inherited from one chosen stem, or its own?
6. Does the mixing logic live in a new framework-agnostic package, and is the web engine shared with the piano's Web Audio code?
7. Export: format, destination, and whether it is part of the first slice.
