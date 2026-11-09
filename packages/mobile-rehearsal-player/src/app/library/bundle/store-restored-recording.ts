import type { Recording } from '@org/audio-library-models';

import type { RecordingsStore } from '../recording/recordings-store-types';

/** Samples per stored chunk: about a second and a half of 44.1 kHz audio, small enough to write in turn. */
const SAMPLES_PER_CHUNK = 65_536;
const BYTES_PER_SAMPLE = 2;

/**
 * Writes a restored recording the way the recorder does: created, filled chunk
 * by chunk, then completed, so a crash part way leaves an incomplete take the
 * app already knows how to recover or discard.
 */
export const storeRestoredRecording = async (
  store: Pick<
    RecordingsStore,
    'create' | 'appendChunk' | 'complete' | 'delete'
  >,
  recording: Recording,
  samples: Int16Array,
): Promise<void> => {
  const stored: Recording = {
    ...recording,
    sizeBytes: samples.length * BYTES_PER_SAMPLE,
  };

  await store.create(stored);

  try {
    for (let start = 0; start < samples.length; start += SAMPLES_PER_CHUNK) {
      await store.appendChunk(
        stored.id,
        samples.subarray(start, start + SAMPLES_PER_CHUNK),
        { durationMs: stored.durationMs, timeline: stored.timeline },
      );
    }

    await store.complete(stored);
  } catch (error) {
    // Do not leave a half-written take behind.
    await store.delete(stored.id).catch(() => undefined);

    throw error;
  }
};
