import {
  createRecordingPlayableItem,
  getRecordingOpenContext,
  type DriveAudioSource,
  type NamedLoop,
  type PlayableItem,
  type Recording,
} from '@org/audio-library-models';

export const RECORDING_TRACK_UNAVAILABLE =
  'The track this was recorded on is no longer in your library.';

export type RecordingPlaybackResolution =
  | { kind: 'item'; item: PlayableItem }
  | { kind: 'unavailable'; message: string };

/**
 * The playable item for a recording, or why it cannot be played (rehearsal-
 * recording design Decision 11): its owning loop, adjusted copy or track must
 * still be in the library, because the recording holds no copy of the audio.
 */
export const resolveRecordingPlayback = (
  recording: Recording,
  library: {
    sources: readonly DriveAudioSource[];
    loops: readonly NamedLoop[];
  },
): RecordingPlaybackResolution => {
  const context = getRecordingOpenContext(recording, {
    sources: library.sources,
    loops: library.loops,
  });
  const source = context
    ? library.sources.find(({ id }) => id === context.sourceId)
    : undefined;

  if (!context || !source) {
    return { kind: 'unavailable', message: RECORDING_TRACK_UNAVAILABLE };
  }

  const loop = context.loopId
    ? library.loops.find(({ id }) => id === context.loopId)
    : undefined;

  return {
    kind: 'item',
    item: createRecordingPlayableItem({ recording, context, source, loop }),
  };
};
