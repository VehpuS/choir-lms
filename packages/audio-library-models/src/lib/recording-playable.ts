import type { PlaybackShaping } from './playback-shaping.ts';
import type { Recording } from './recording.ts';
import {
  getRecordingOpenContext,
  type RecordingOpenContext,
} from './recording-visibility.ts';
import {
  createLoopPlayableItem,
  createTrackPlayableItem,
  type DriveAudioSource,
  type NamedLoop,
  type PlayableItem,
  type PlaylistEntry,
} from './rehearsal-domain.ts';

/**
 * A recording as a playable item (rehearsal-recording design Decision 11): it
 * plays on its track in the context it was made in, with the range and the
 * speed and pitch it was recorded against, so playing it needs no special
 * mode and playing anything else simply replaces it.
 */

const RECORDING_ITEM_PREFIX = 'recording:';
const DESCRIPTION_PREFIX = 'Recording';

export type RecordingPlayableOptions = {
  recording: Pick<Recording, 'id' | 'name' | 'lineage'>;
  context: RecordingOpenContext;
  /** The audio to play: the saved adjusted copy, else the saved track. */
  source: DriveAudioSource;
  /** The loop of a loop recording, if it still exists. */
  loop?: NamedLoop | null;
};

/**
 * Always an explicit transform, neutral included, so a recording made with no
 * shaping plays unshaped even when the session carries some.
 */
const toTransform = (
  shaping: RecordingOpenContext['shaping'],
): PlaybackShaping => ({
  pitchSemitones: shaping.pitchSemitones,
  speedMultiplier: shaping.rate,
  tempoSource: 'multiplier',
});

export const createRecordingPlayableItem = (
  options: RecordingPlayableOptions,
): PlayableItem => {
  const { context, loop, recording, source } = options;
  const base =
    context.kind === 'loop' && loop
      ? createLoopPlayableItem(loop, source)
      : createTrackPlayableItem(source);
  const transform = toTransform(context.shaping);

  return {
    ...base,
    id: `${RECORDING_ITEM_PREFIX}${recording.id}`,
    title: recording.name,
    description: `${DESCRIPTION_PREFIX} · ${loop?.name ?? recording.lineage.track.name}`,
    range: context.range
      ? { startMs: context.range.startMs, endMs: context.range.endMs }
      : base.range,
    recordingId: recording.id,
    // The recording's own shaping always wins over the track's or loop's.
    transform,
  };
};

/** A recording item that plays only part of its track and stops at the end of it. */
export const isRangeLimitedRecordingItem = (
  item: Pick<PlayableItem, 'kind' | 'range' | 'recordingId' | 'source'>,
): boolean => {
  const { durationMs } = item.source;

  return (
    item.recordingId !== undefined &&
    item.kind === 'track' &&
    item.range.endMs !== null &&
    (item.range.startMs > 0 ||
      durationMs === undefined ||
      item.range.endMs < durationMs)
  );
};

/**
 * The playable item for a recording, or `null` when its track (or adjusted
 * copy) has left the library, since a recording holds no copy of the audio.
 */
export const resolveRecordingPlayableItem = (
  recording: Pick<
    Recording,
    'id' | 'name' | 'lineage' | 'shaping' | 'source' | 'timeline'
  >,
  library: {
    sources: readonly DriveAudioSource[];
    loops: readonly NamedLoop[];
  },
): PlayableItem | null => {
  const context = getRecordingOpenContext(recording, library);
  const source = context
    ? library.sources.find(({ id }) => id === context.sourceId)
    : undefined;

  if (!context || !source) {
    return null;
  }

  const loop = context.loopId
    ? library.loops.find(({ id }) => id === context.loopId)
    : undefined;

  return createRecordingPlayableItem({ recording, context, source, loop });
};

/** A playlist entry that plays a recording in the context it was made in. */
export const createPlaylistEntryFromRecording = (
  recording: Pick<Recording, 'id' | 'name' | 'lineage'>,
  createdAt: string,
  options?: { playlistId?: string; sortIndex?: number },
): PlaylistEntry => {
  const { adjusted, loop, track } = recording.lineage;

  return {
    id: `entry:recording:${recording.id}:${createdAt}`,
    playlistId: options?.playlistId ?? '',
    sortIndex: options?.sortIndex ?? 0,
    kind: loop ? 'loop' : 'track',
    sourceId: adjusted?.id ?? track.id,
    ...(loop ? { loopId: loop.id } : {}),
    recordingId: recording.id,
    title: recording.name,
    description: `${DESCRIPTION_PREFIX} · ${loop?.name ?? track.name}`,
    createdAt,
  };
};
