## Why

`nocturne-visual-system-and-playback-shaping` shipped the Nocturne visual system, real-audio waveforms and playback shaping, verified on web. Native iOS and Android were deliberately out of scope (decided 2026-10-02 and 2026-10-06), which left three native-only items. They are tracked here so that change can be archived without losing them.

## What Changes

- Native waveform peaks: native shows the neutral flat band today because it has no decoder. Choose between a native decoder module, a JS-only partial MP3 envelope, or a server step, after a spike.
- Peak storage on device: confirm the AsyncStorage budget, eviction and quota-error behavior once native has an extractor.
- Semitone pitch on native: web has independent pitch through a SoundTouch worklet; native shows the inert fallback (`canShapePitch`) until a native pitch path exists.

## Impact

Not scheduled. Design and spec deltas are to be written when native becomes a priority target. See `tasks.md` for the full notes carried over from the original items.
