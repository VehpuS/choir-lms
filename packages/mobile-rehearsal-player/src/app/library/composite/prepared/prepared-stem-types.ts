import type { WaveformPeaks } from '@org/audio-library-models';
import type { PcmWindowReader } from '@org/audio-mixing';

/**
 * What identifies a prepared stem: the composite and stem it plays for, and the
 * version of the track's audio it was prepared from (the Drive `modifiedTime`).
 * A stem prepared from an older version is never read as the current one.
 */
export type PreparedStemKey = {
  compositeId: string;
  stemId: string;
  contentVersion: string;
};

/**
 * A prepared stem as stored. While `writing` the counts are the checkpoint
 * written with the latest chunk and the stem cannot be read; `complete` is set
 * when preparation finishes.
 */
export type StoredPreparedStem = PreparedStemKey & {
  id: string;
  status: 'writing' | 'complete';
  sampleRate: number;
  chunkCount: number;
  sampleCount: number;
  sizeBytes: number;
  /** For the composite waveform (design Decision 8); absent for a silent or very short stem. */
  peaks?: WaveformPeaks;
};

/**
 * The few atomic operations the store needs from storage. `appendChunk` writes
 * the chunk and the updated record in one transaction: both land or neither
 * does, so a failed write never leaves a chunk the record does not count.
 */
export type PreparedStemsBackend = {
  putRecord: (record: StoredPreparedStem) => Promise<void>;
  getRecord: (id: string) => Promise<StoredPreparedStem | undefined>;
  listRecords: () => Promise<StoredPreparedStem[]>;
  appendChunk: (
    record: StoredPreparedStem,
    index: number,
    chunk: Blob,
  ) => Promise<void>;
  /** Chunk blobs in order. */
  getChunks: (id: string) => Promise<Blob[]>;
  /** Removes the record and all its chunks together. */
  deleteStem: (id: string) => Promise<void>;
};

export class PreparedStemsUnavailableError extends Error {
  constructor() {
    super('Prepared stems are not available on this platform');
    this.name = 'PreparedStemsUnavailableError';
  }
}

/** Writes one stem's mono 16-bit samples in order. Chunks may be any size. */
export type PreparedStemWriter = {
  /** Rejects when the chunk cannot be stored (storage full); nothing partial is kept readable. */
  write: (samples: Int16Array) => Promise<void>;
  /** Marks the stem readable. Without it the stem stays unreadable. */
  finish: (peaks?: WaveformPeaks | null) => Promise<void>;
  /** Removes what was written so far. Safe to call after a failure. */
  abort: () => Promise<void>;
};

export type PreparedStemStore = {
  /** Starts a stem, replacing anything stored for it (an older version or a half-written stem). */
  begin: (
    key: PreparedStemKey,
    format: { sampleRate: number },
  ) => Promise<PreparedStemWriter>;
  /** A complete stem at this content version, as a window reader; null otherwise. */
  open: (key: PreparedStemKey) => Promise<PcmWindowReader | null>;
  /** The stem's waveform peaks, when it is complete at this version and has them. */
  getPeaks: (key: PreparedStemKey) => Promise<WaveformPeaks | null>;
  /** Whether `open` would find the stem. */
  has: (key: PreparedStemKey) => Promise<boolean>;
  sizeBytes: () => Promise<number>;
  sizeBytesOfComposite: (compositeId: string) => Promise<number>;
  deleteComposite: (compositeId: string) => Promise<void>;
  deleteAll: () => Promise<void>;
};
