/**
 * How long a recording can still run, from the storage the browser gives this
 * site (rehearsal-recording design Decision 20). Shown like the time left on a
 * camera's memory card, so the numbers are estimates and worded as such.
 */

const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_SAMPLE = 2;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MINUTES_PER_HOUR = 60;

/** Left for the metadata and the app's other stores; recording never eats into it. */
export const RECORDING_STORAGE_RESERVE_BYTES = 50 * BYTES_PER_MB;
/** Below this the readout turns into a warning. */
export const RECORDING_WARNING_TIME_LEFT_MS = 5 * MS_PER_MINUTE;
/** Below this a new recording is refused. */
export const RECORDING_MIN_START_TIME_LEFT_MS = MS_PER_MINUTE;

export type StorageEstimateReading = { quota?: number; usage?: number };

/** Reads the browser's estimate, or `null` where there is none. */
export type StorageEstimateSource =
  () => Promise<StorageEstimateReading | null>;

export type RecordingTimeLeft =
  /** The browser cannot say; no readout, and a recording stops only on a failed write. */
  | { state: 'unknown' }
  | {
      state: 'ok' | 'warning' | 'full';
      timeLeftMs: number;
    };

export const bytesPerSecond = (sampleRate: number) => {
  return sampleRate * BYTES_PER_SAMPLE;
};

/** Pure: free space to time left, with the reserve held back. */
export const resolveRecordingTimeLeft = (
  reading: StorageEstimateReading | null,
  sampleRate: number,
): RecordingTimeLeft => {
  if (
    !reading ||
    typeof reading.quota !== 'number' ||
    typeof reading.usage !== 'number' ||
    sampleRate <= 0
  ) {
    return { state: 'unknown' };
  }

  const freeBytes = Math.max(
    0,
    reading.quota - reading.usage - RECORDING_STORAGE_RESERVE_BYTES,
  );
  const timeLeftMs = Math.floor(
    (freeBytes / bytesPerSecond(sampleRate)) * MS_PER_SECOND,
  );

  if (timeLeftMs <= 0) {
    return { state: 'full', timeLeftMs: 0 };
  }

  return {
    state: timeLeftMs < RECORDING_WARNING_TIME_LEFT_MS ? 'warning' : 'ok',
    timeLeftMs,
  };
};

export const readRecordingTimeLeft = async (
  estimate: StorageEstimateSource,
  sampleRate: number,
): Promise<RecordingTimeLeft> => {
  try {
    return resolveRecordingTimeLeft(await estimate(), sampleRate);
  } catch {
    // An estimate that throws is no different from one that is missing.
    return { state: 'unknown' };
  }
};

/** Whether a new recording may start; an unknown estimate never blocks it. */
export const canStartRecording = (timeLeft: RecordingTimeLeft) => {
  return (
    timeLeft.state === 'unknown' ||
    timeLeft.timeLeftMs >= RECORDING_MIN_START_TIME_LEFT_MS
  );
};

/** `About 1 h 20 min left`, `About 12 min left`, or `Less than a minute left`. */
export const formatTimeLeft = (timeLeftMs: number): string => {
  const minutes = Math.floor(timeLeftMs / MS_PER_MINUTE);

  if (minutes < 1) {
    return 'Less than a minute left';
  }

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;

  if (hours === 0) {
    return `About ${rest} min left`;
  }

  return rest === 0
    ? `About ${hours} h left`
    : `About ${hours} h ${rest} min left`;
};

/** The browser's own estimate, where it has one. */
export const browserStorageEstimate: StorageEstimateSource = async () => {
  const storage = (
    globalThis as {
      navigator?: {
        storage?: { estimate?: () => Promise<StorageEstimateReading> };
      };
    }
  ).navigator?.storage;

  return storage?.estimate ? storage.estimate() : null;
};
