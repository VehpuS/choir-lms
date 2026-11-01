import { omit } from 'es-toolkit';
import {
  type Recording,
  type RecordingTimelineSegment,
} from '@org/audio-library-models';

import type { RecordingChunkWriter } from './recorder-types';
import type { RecordingDraft } from './recording-metadata';
import { completeRecording } from './recording-metadata';
import type { RecordingsStore } from './recordings-store-types';

/**
 * Connects the recorder to the store for one recording: the chunk writer the
 * recorder calls, with the timeline supplied by whatever watches the track.
 */
export const createRecordingWriter = (options: {
  store: RecordingsStore;
  draft: RecordingDraft;
  /** The timeline as it stands at `elapsedMs` of the recording. */
  getTimeline: (elapsedMs: number) => RecordingTimelineSegment[];
  /** Called with the finished recording, after it is stored. */
  onSaved?: (recording: Recording) => void;
}): RecordingChunkWriter => {
  const { store, draft, getTimeline } = options;
  let sampleRate = 0;

  const emptyRecording = (): Recording => {
    return {
      ...omit(draft, ['markerSnapshot']),
      durationMs: 0,
      sampleRate,
      sizeBytes: 0,
      markers: [],
      timeline: [],
    };
  };

  return {
    begin: async (format) => {
      sampleRate = format.sampleRate;
      await store.create(emptyRecording());
    },
    append: (chunk, progress) =>
      store.appendChunk(draft.id, chunk, {
        durationMs: progress.elapsedMs,
        timeline: getTimeline(progress.elapsedMs),
      }),
    finalize: async ({ durationMs, sizeBytes }) => {
      const recording = completeRecording(draft, {
        durationMs,
        sampleRate,
        sizeBytes,
        timeline: getTimeline(durationMs),
      });

      await store.complete(recording);
      options.onSaved?.(recording);
    },
    discard: () => store.delete(draft.id),
  };
};
