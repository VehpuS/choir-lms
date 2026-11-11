## Context

`composite-tracks` stores a composite as a record of stems plus a mix, with a `markers` field already carried on the record and `createCompositeOwnerSources` to present a composite as an owner. The loop builder and marker editor take a track, and the loops collection is keyed by a saved source. A composite plays through its own engine, so a loop range maps to the mix timeline, not a media element.

## Goals / Non-Goals

**Goals:**

- A composite can own loops and markers in composite time, listed and played like a track's.
- One write path per kind: markers on the composite record, loops in the loops collection.

**Non-Goals:**

- Copying stem markers into a composite.
- Recording over a composite (see `composite-recording-stems`).
- Per-stem loops.

## Decisions

- **Owner kind:** a loop gets an owner of kind `composite` with the composite id, instead of a fake track source. Alternative: a synthetic source per composite, rejected because it leaks into track lists.
- **Markers live on the composite record**, saved with the composite store's `edit`, so deleting a composite deletes them.
- **Entry points are explored with the user first** (playback sheet overflow, Composites row menu, Files composite menu, Mix panel) and recorded here before building.

## Risks / Trade-offs

- [Loop range depends on composite length, which changes when a stem is added or offset] → store ranges in composite time and clamp on read.
- [Existing lists assume a track owner] → route them through owner sources, covered by specs.

## Open Questions

- Which entry points are offered first, and where the marker list shows for a composite.
