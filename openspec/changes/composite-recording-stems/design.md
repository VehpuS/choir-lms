## Context

A composite stem references a library track by id. A recording is stored separately, with a clock anchor that ties it to the track it was made over, and `audio-mixing` already fits a recording to a timeline. Recording over a composite is not possible today, so users record over a single track and want that take in the composite.

## Goals / Non-Goals

**Goals:**
- Add a recording to a composite as a stem, aligned and mixable like any other stem.

**Non-Goals:**
- Recording live over a composite's mix.
- Changing how recordings are made over a track.

## Decisions

- **Stem source kind:** a stem references either a track or a recording, with a source kind on the stem. Alternative: save the recording as a library track first, rejected because it copies audio and clutters the Library.
- **Alignment** comes from the recording's anchor to the track it was made over, then the stem offset places it on the composite.
- **Deleting the recording** shows the stem as missing, like a deleted track.

## Risks / Trade-offs

- [Prepared stems cache keyed by track id] → key by source kind and id.
- [Stem offset meaning differs for recordings] → covered by specs and a spec for the fit.

## Open Questions

- Entry points, default stem name, and whether it is marked `mine` by default.
