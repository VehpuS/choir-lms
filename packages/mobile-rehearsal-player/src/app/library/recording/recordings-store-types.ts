import type {
  Recording,
  RecordingOwner,
  RecordingTimelineSegment,
} from '@org/audio-library-models';

/**
 * A recording as stored. While `recording`, the duration, size and timeline
 * are the checkpoint written with the latest chunk, so everything captured so
 * far is already safe; `complete` is set when the recorder finalizes.
 */
export type StoredRecording = Recording & {
  status: 'recording' | 'complete';
  chunkCount: number;
  sampleCount: number;
};

export type RecordingCheckpoint = {
  durationMs: number;
  timeline: RecordingTimelineSegment[];
};

export class RecordingsUnavailableError extends Error {
  constructor() {
    super('Recordings are not available on this platform');
    this.name = 'RecordingsUnavailableError';
  }
}

/**
 * The few atomic operations the store needs from storage. `appendChunk` writes
 * the chunk and the updated record in one transaction: both land or neither
 * does, so the recorder can retry a failed chunk without duplicating it.
 */
export type RecordingsBackend = {
  putRecord: (record: StoredRecording) => Promise<void>;
  getRecord: (id: string) => Promise<StoredRecording | undefined>;
  listRecords: () => Promise<StoredRecording[]>;
  appendChunk: (
    record: StoredRecording,
    index: number,
    chunk: Blob,
  ) => Promise<void>;
  /** Chunk blobs in order. */
  getChunks: (id: string) => Promise<Blob[]>;
  /** Removes the record and all its chunks together. */
  deleteRecording: (id: string) => Promise<void>;
};

export type RecordingsStore = {
  /** Starts a recording: stored at once, marked as in progress. */
  create: (recording: Recording) => Promise<void>;
  appendChunk: (
    id: string,
    chunk: Int16Array,
    checkpoint: RecordingCheckpoint,
  ) => Promise<void>;
  /** Closes a recording with its final record and asks for persistent storage once. */
  complete: (recording: Recording) => Promise<void>;
  get: (id: string) => Promise<Recording | null>;
  /** Finished recordings, newest first. */
  list: () => Promise<Recording[]>;
  listByOwner: (owner: RecordingOwner) => Promise<Recording[]>;
  /** Recordings a crash or a failed finalize left unfinished. */
  listIncomplete: () => Promise<Recording[]>;
  update: (
    id: string,
    patch: Partial<Pick<Recording, 'balance' | 'exports' | 'name' | 'nudgeMs'>>,
  ) => Promise<void>;
  /**
   * Like `update`, but the patch is worked out from the stored recording inside
   * the same turn, so a change that depends on the current value (adding to the
   * export record) cannot overwrite a concurrent one.
   */
  modify: (
    id: string,
    patchFrom: (
      recording: Recording,
    ) => Partial<Pick<Recording, 'balance' | 'exports' | 'name' | 'nudgeMs'>>,
  ) => Promise<void>;
  /** The recording as a WAV file, assembled from its chunks without copying them. */
  getWavBlob: (id: string) => Promise<Blob | null>;
  /** Removes the recording and its audio. The only thing that ever does. */
  delete: (id: string) => Promise<void>;
  totalSizeBytes: () => Promise<number>;
};
