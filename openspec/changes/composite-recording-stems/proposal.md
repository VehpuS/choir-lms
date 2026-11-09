## Why

While a composite plays, the Practice tools `Recording` entry is hidden, because recording follows a media element's clock that a composite does not have. Singers still want to add their own part to a composite. Instead of recording over the mix, a recording can become another stem of the composite. This was split out of `composite-tracks` (task 12.3).

## What Changes

- Let the user add a recording as a new stem of a composite, from the composite and from the Recordings list.
- The stem is the recorded audio, aligned by the recording's clock anchor to the composite's timeline, with its own name, level, mute and solo like any stem.
- Mark it as the user's part where it applies, so `My part` and the mix presets treat it as such.
- `Recording` stays hidden in Practice tools while a composite plays.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `composite-tracks`: a composite stem can come from a recording.

## Impact

- `library/composite` (stem model, create/add flow, mix panel), `library/recording` (recordings store, anchors), `audio-library-models` (stem source kind), `audio-mixing` (recording timeline already exists).
- Needs a design pass with the user: which entry points, how the stem is named and aligned, and what happens when the recording is deleted.
