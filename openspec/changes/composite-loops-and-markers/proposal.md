## Why

The `composite-tracks` change says a composite owns its loops and markers, in composite time, but the loop builder and marker editor only offer tracks, and the lists that resolve owners take the saved sources without the composite. Loops and markers are core to rehearsal, so a composite is half-usable without them. This was split out of `composite-tracks` (task 12.5) because it needs its entry points designed with the user first.

## What Changes

- Let the user make a loop on a composite (from the playback sheet and the Composites views), with the range in composite time.
- Let the user add, edit and remove markers on a composite, stored on the composite record.
- Show a composite's loops and markers in the lists that resolve owners (use `createCompositeOwnerSources`), and play a composite loop as the same range of the mix.
- Stem tracks' own markers are not copied into the composite.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `practice-loops-and-playlists`: a loop can belong to a composite and plays that range of the mix.
- `track-markers`: markers can belong to a composite and are kept in composite time.

## Impact

- `packages/mobile-rehearsal-player/src/app/library/loops` (loop builder, loop lists), `library/markers`, `library/composite` (store, owner sources).
- `audio-library-models` (loop owner kind), `audio-library-runtime` (loops collection write path), the composite record (markers).
- Entry points need a design pass with the user before building.
