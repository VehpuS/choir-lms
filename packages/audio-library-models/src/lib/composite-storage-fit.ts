/**
 * Whether a composite's prepared stems fit in the browser's storage
 * (composite-tracks design Decision 9, spike 1.3: prepared storage only, no
 * memory tier). Prepared stems are 16-bit mono PCM at the context rate whatever
 * the source's channels (the mono decision in the design's Spike results).
 */

export const PREPARED_BYTES_PER_SAMPLE = 2;
const MS_PER_SECOND = 1000;

export type PreparedStemSize = {
  durationMs: number;
  /** Already in the prepared store, so it needs no more room. */
  prepared?: boolean;
};

/** Bytes one prepared stem takes: duration × sample rate × 2 bytes (one channel). */
export const estimatePreparedStemBytes = (
  stem: PreparedStemSize,
  sampleRate: number,
): number => {
  if (!(stem.durationMs > 0) || !(sampleRate > 0)) {
    return 0;
  }

  return Math.ceil(
    (stem.durationMs / MS_PER_SECOND) * sampleRate * PREPARED_BYTES_PER_SAMPLE,
  );
};

/** Bytes still to be written: the stems that are not prepared yet. */
export const estimateCompositeBytesNeeded = (
  stems: readonly PreparedStemSize[],
  sampleRate: number,
): number => {
  return stems
    .filter((stem) => !stem.prepared)
    .reduce(
      (total, stem) => total + estimatePreparedStemBytes(stem, sampleRate),
      0,
    );
};

/** What the browser says about its storage; both fields are optional in practice. */
export type StorageEstimateReading = {
  quota?: number;
  usage?: number;
};

/** `navigator.storage.estimate()` behind an interface, so the model has no browser dependency. */
export type StorageEstimator = {
  estimate: () => Promise<StorageEstimateReading | undefined>;
};

export type StorageFit = 'fits' | 'does-not-fit' | 'unknown';

export type StorageFitResult = {
  fit: StorageFit;
  bytesNeeded: number;
  /** Room left by the browser's own figures; undefined when it cannot say. */
  bytesAvailable: number | undefined;
};

const isUsableNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
};

/**
 * Compares the bytes needed with the room the browser reports. `unknown` when
 * there is no estimator, it throws, or it gives no usable quota, so preparing
 * is attempted and a write failure is handled instead (task 4.3). Nothing
 * needed always fits.
 */
export const checkCompositeStorageFit = async (
  stems: readonly PreparedStemSize[],
  sampleRate: number,
  estimator: StorageEstimator | undefined,
): Promise<StorageFitResult> => {
  const bytesNeeded = estimateCompositeBytesNeeded(stems, sampleRate);

  if (bytesNeeded === 0) {
    return { fit: 'fits', bytesNeeded, bytesAvailable: undefined };
  }

  let reading: StorageEstimateReading | undefined;

  try {
    reading = await estimator?.estimate();
  } catch {
    reading = undefined;
  }

  if (!reading || !isUsableNumber(reading.quota)) {
    return { fit: 'unknown', bytesNeeded, bytesAvailable: undefined };
  }

  const bytesAvailable = Math.max(
    0,
    reading.quota - (isUsableNumber(reading.usage) ? reading.usage : 0),
  );

  return {
    fit: bytesNeeded <= bytesAvailable ? 'fits' : 'does-not-fit',
    bytesNeeded,
    bytesAvailable,
  };
};
