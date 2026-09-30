/**
 * Waveform peaks derived from an item's own audio (design Decision 4).
 *
 * A track is reduced to a fixed number of one-byte amplitude buckets: one
 * bucket per millisecond up to `MAX_PEAK_BUCKETS`, so anything shorter than
 * two minutes gets fewer buckets and longer tracks stretch each bucket. The
 * model is framework-agnostic; extraction from PCM and slicing for display
 * live here, while decoding and persistence belong to the app.
 */

/** Bumped when the bucket layout changes, which invalidates cached peaks. */
export const WAVEFORM_PEAKS_FORMAT_VERSION = 1;

export const MAX_PEAK_BUCKETS = 120_000;

/** No bucket spans less than this, so short tracks do not get empty buckets. */
export const MIN_PEAK_BUCKET_SECONDS = 0.001;

const MAX_BUCKET_VALUE = 255;
const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_PADDING = '=';

export type WaveformPeaks = {
  /** One 0–255 amplitude per bucket, where 255 is full scale. */
  buckets: Uint8Array;
  durationMs: number;
  formatVersion: number;
};

/** The JSON-safe form that is persisted. */
export type SerializedWaveformPeaks = {
  data: string;
  durationMs: number;
  formatVersion: number;
};

export const getPeakBucketCount = (durationSeconds: number) => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0;
  }

  return Math.min(
    MAX_PEAK_BUCKETS,
    Math.max(1, Math.ceil(durationSeconds / MIN_PEAK_BUCKET_SECONDS)),
  );
};

/**
 * Reduces decoded PCM to peaks: each bucket holds the loudest absolute sample
 * of any channel inside it, so a short transient still shows.
 */
export const computeWaveformPeaks = (
  channels: readonly ArrayLike<number>[],
  sampleRate: number,
): WaveformPeaks | null => {
  const sampleCount = channels.reduce((longest, channel) => {
    return Math.max(longest, channel.length);
  }, 0);

  if (sampleCount === 0 || !(sampleRate > 0)) {
    return null;
  }

  const durationSeconds = sampleCount / sampleRate;
  const bucketCount = Math.min(
    getPeakBucketCount(durationSeconds),
    sampleCount,
  );
  const buckets = new Uint8Array(bucketCount);

  for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex += 1) {
    const start = Math.floor((bucketIndex * sampleCount) / bucketCount);
    const end = Math.floor(((bucketIndex + 1) * sampleCount) / bucketCount);
    let peak = 0;

    for (const channel of channels) {
      const channelEnd = Math.min(end, channel.length);

      for (let index = start; index < channelEnd; index += 1) {
        const magnitude = Math.abs(channel[index]);

        if (magnitude > peak) {
          peak = magnitude;
        }
      }
    }

    buckets[bucketIndex] = Math.round(Math.min(1, peak) * MAX_BUCKET_VALUE);
  }

  return {
    buckets,
    durationMs: Math.round(durationSeconds * 1000),
    formatVersion: WAVEFORM_PEAKS_FORMAT_VERSION,
  };
};

const encodeBase64 = (bytes: Uint8Array) => {
  let encoded = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const chunk = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    encoded += BASE64_ALPHABET[(chunk >> 18) & 63];
    encoded += BASE64_ALPHABET[(chunk >> 12) & 63];
    encoded +=
      second === undefined
        ? BASE64_PADDING
        : BASE64_ALPHABET[(chunk >> 6) & 63];
    encoded +=
      third === undefined ? BASE64_PADDING : BASE64_ALPHABET[chunk & 63];
  }

  return encoded;
};

const decodeBase64 = (encoded: string) => {
  const paddingLength = encoded.endsWith('==')
    ? 2
    : encoded.endsWith(BASE64_PADDING)
      ? 1
      : 0;
  const bytes = new Uint8Array((encoded.length / 4) * 3 - paddingLength);
  let byteIndex = 0;

  for (let index = 0; index < encoded.length; index += 4) {
    let chunk = 0;

    for (let offset = 0; offset < 4; offset += 1) {
      const character = encoded[index + offset];
      const value =
        character === BASE64_PADDING ? 0 : BASE64_ALPHABET.indexOf(character);

      if (value < 0) {
        return null;
      }

      chunk = (chunk << 6) | value;
    }

    for (let offset = 0; offset < 3 && byteIndex < bytes.length; offset += 1) {
      bytes[byteIndex] = (chunk >> (16 - offset * 8)) & 255;
      byteIndex += 1;
    }
  }

  return bytes;
};

export const serializeWaveformPeaks = (
  peaks: WaveformPeaks,
): SerializedWaveformPeaks => {
  return {
    data: encodeBase64(peaks.buckets),
    durationMs: peaks.durationMs,
    formatVersion: peaks.formatVersion,
  };
};

/** Returns null for anything malformed or written by another format version. */
export const deserializeWaveformPeaks = (
  value: unknown,
): WaveformPeaks | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const { data, durationMs, formatVersion } =
    value as Partial<SerializedWaveformPeaks>;

  if (
    formatVersion !== WAVEFORM_PEAKS_FORMAT_VERSION ||
    typeof data !== 'string' ||
    data.length === 0 ||
    data.length % 4 !== 0 ||
    typeof durationMs !== 'number' ||
    !(durationMs > 0)
  ) {
    return null;
  }

  const buckets = decodeBase64(data);

  return buckets && buckets.length > 0
    ? { buckets, durationMs, formatVersion }
    : null;
};

export type WaveformRangeMs = {
  endMs: number;
  startMs: number;
};

/**
 * Reduces the peaks inside `range` to `barCount` display bars in 0–1, keeping
 * the loudest bucket of each bar. `gain` scales the bars so a track's loudest
 * point fills the bar height; pass `getWaveformPeakGain(peaks)`.
 */
export const resolveWaveformBars = (
  peaks: WaveformPeaks,
  range: WaveformRangeMs,
  barCount: number,
  gain = 1,
): number[] => {
  const bucketCount = peaks.buckets.length;

  if (barCount <= 0 || bucketCount === 0 || peaks.durationMs <= 0) {
    return [];
  }

  const startBucket = clampIndex(
    (range.startMs / peaks.durationMs) * bucketCount,
    bucketCount,
  );
  const endBucket = Math.max(
    startBucket + 1,
    clampIndex((range.endMs / peaks.durationMs) * bucketCount, bucketCount + 1),
  );
  const span = endBucket - startBucket;

  return Array.from({ length: barCount }, (_, barIndex) => {
    const from = startBucket + Math.floor((barIndex * span) / barCount);
    const to = Math.max(
      from + 1,
      startBucket + Math.floor(((barIndex + 1) * span) / barCount),
    );
    let peak = 0;

    for (let index = from; index < to && index < bucketCount; index += 1) {
      if (peaks.buckets[index] > peak) {
        peak = peaks.buckets[index];
      }
    }

    return Math.min(1, (peak / MAX_BUCKET_VALUE) * gain);
  });
};

const clampIndex = (value: number, limit: number) => {
  return Math.min(limit - 1, Math.max(0, Math.floor(value)));
};

/** The factor that brings a track's loudest bucket to full bar height. */
export const getWaveformPeakGain = (peaks: WaveformPeaks) => {
  let loudest = 0;

  for (const value of peaks.buckets) {
    if (value > loudest) {
      loudest = value;
    }
  }

  return loudest === 0 ? 1 : MAX_BUCKET_VALUE / loudest;
};
