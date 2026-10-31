import {
  getRecordedTrackRange,
  isWholeTrackRecording,
} from './recording-timeline.ts';
import type { TrackRange } from './recording-timeline.ts';
import type { Recording, RecordingShaping } from './recording.ts';
import type { DriveAudioSource, NamedLoop } from './rehearsal-domain.ts';

/**
 * Where a recording is listed and what opening it restores (rehearsal-recording
 * design Decisions 10 and 11). Both read the recording's stored lineage and ask
 * the live library only whether each entity still exists.
 */

export type RecordingLibrary = {
  sources: readonly Pick<DriveAudioSource, 'id'>[];
  loops: readonly Pick<NamedLoop, 'id'>[];
};

/** `main` is the plain list; `loops` is the `Loops` section, grouped by `loopId`. */
export type RecordingPlacement =
  | { surface: 'track-main'; entityId: string }
  | { surface: 'track-loops'; entityId: string; loopId: string }
  | { surface: 'adjusted-main'; entityId: string }
  | { surface: 'adjusted-loops'; entityId: string; loopId: string }
  | { surface: 'loop'; entityId: string };

export const getRecordingPlacements = (
  recording: Pick<Recording, 'lineage'>,
  library: RecordingLibrary,
): RecordingPlacement[] => {
  const { adjusted, loop, track } = recording.lineage;
  const hasSource = (id: string) => library.sources.some((s) => s.id === id);
  const adjustedExists = adjusted !== undefined && hasSource(adjusted.id);
  const loopExists =
    loop !== undefined && library.loops.some((l) => l.id === loop.id);
  const placements: RecordingPlacement[] = [];

  if (loop && loopExists) {
    placements.push({ surface: 'loop', entityId: loop.id });
  }

  if (loop) {
    if (adjustedExists) {
      placements.push({
        surface: 'adjusted-loops',
        entityId: adjusted.id,
        loopId: loop.id,
      });
    }

    // A recording made on a loop is never in the main list of its track.
    placements.push({
      surface: 'track-loops',
      entityId: track.id,
      loopId: loop.id,
    });

    return placements;
  }

  if (adjustedExists) {
    placements.push({ surface: 'adjusted-main', entityId: adjusted.id });
  }

  // Also listed under the parent, labelled with the adjustment, and the only
  // place left once the adjusted copy is deleted.
  placements.push({ surface: 'track-main', entityId: track.id });

  return placements;
};

export type RecordingOpenContext = {
  kind: 'loop' | 'adjusted' | 'track';
  /** The saved track to open: the adjusted copy, else the parent track. */
  sourceId: string;
  loopId?: string;
  /** The only playable range, or `null` for the whole track. */
  range: TrackRange | null;
  /** Speed and pitch to apply and lock; always the recording's own. */
  shaping: RecordingShaping;
};

export const getRecordingOpenContext = (
  recording: Pick<Recording, 'lineage' | 'shaping' | 'source' | 'timeline'>,
  library: RecordingLibrary,
): RecordingOpenContext | null => {
  const { adjusted, loop, track } = recording.lineage;
  const hasSource = (id: string) => library.sources.some((s) => s.id === id);
  const adjustedExists = adjusted !== undefined && hasSource(adjusted.id);
  const sourceId = adjustedExists ? adjusted.id : track.id;
  const { shaping } = recording;

  if (!hasSource(sourceId)) {
    return null;
  }

  if (loop && library.loops.some((l) => l.id === loop.id)) {
    return {
      kind: 'loop',
      sourceId,
      loopId: loop.id,
      range: { startMs: loop.startMs, endMs: loop.endMs },
      shaping,
    };
  }

  // A deleted loop leaves only its stored range; the recorded span stands in.
  const range = isWholeTrackRecording(recording)
    ? null
    : getRecordedTrackRange(recording);

  return {
    kind: adjustedExists ? 'adjusted' : 'track',
    sourceId,
    range,
    shaping,
  };
};
