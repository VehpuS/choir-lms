/**
 * What the recorder needs from storage. The store (task 4.1) provides the real
 * writer; the recorder only appends finished chunks, so memory stays at one
 * chunk however long the take runs (rehearsal-recording design Decision 4).
 */
export type RecordingChunkWriter = {
  /** Called once, before the first chunk. */
  begin: (format: { sampleRate: number }) => Promise<void>;
  /**
   * Appends one chunk of mono Int16 samples; rejects when storage refuses it.
   * It must be all-or-nothing: the recorder retries a rejected chunk, so a
   * failed append must leave nothing behind that a retry could duplicate.
   */
  append: (chunk: Int16Array, progress: { elapsedMs: number }) => Promise<void>;
  /** Marks the recording complete with what was written. */
  finalize: (summary: {
    durationMs: number;
    sampleCount: number;
    sizeBytes: number;
  }) => Promise<void>;
  /** Removes a recording that is not worth keeping (too short). */
  discard: () => Promise<void>;
};

/** Why a recording stopped; callers add the ones only they can see. */
export type RecordingStopReason =
  | 'user'
  | 'hidden'
  | 'track-ended'
  | 'out-point'
  | 'interrupted'
  | 'microphone-ended'
  | 'storage-full'
  | 'storage-failed'
  | 'too-long';

export type RecorderResult =
  | {
      status: 'saved';
      reason: RecordingStopReason;
      durationMs: number;
      sampleRate: number;
      sampleCount: number;
      sizeBytes: number;
      /** Capture time of the first sample on the audio clock, for timeline alignment. */
      captureStartSec: number;
    }
  | { status: 'discarded'; reason: RecordingStopReason; durationMs: number };

export type RecorderProgress = {
  elapsedMs: number;
  /** `undefined` until the first storage reading. */
  timeLeftMs?: number;
  storageState: 'unknown' | 'ok' | 'warning' | 'full';
};
