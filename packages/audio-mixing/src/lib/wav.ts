/**
 * 16-bit PCM WAV, the format recordings are stored and exported in
 * (rehearsal-recording design Decision 4). Header logic is pure and works on
 * bytes so it runs in the app, in tests, and in a worker alike. Samples are
 * written little-endian through `DataView`, never by reinterpreting memory.
 */

export const WAV_HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;
const BITS_PER_SAMPLE = 16;
const PCM_FORMAT = 1;
const FMT_CHUNK_BYTES = 16;
const RIFF_CHUNK_OVERHEAD = 36;
const INT16_MAX = 0x7fff;
const INT16_MIN = -0x8000;
const CHUNK_HEADER_BYTES = 8;
const FMT_MIN_BYTES = 16;
const RIFF_ID = 'RIFF';
const WAVE_ID = 'WAVE';
const FMT_ID = 'fmt ';
const DATA_ID = 'data';

export type WavFormat = {
  sampleRate: number;
  channels: number;
};

export type DecodedWav = WavFormat & {
  /** Interleaved samples. */
  samples: Int16Array;
};

export type WavDecodeFailure =
  | 'not-wav'
  | 'unsupported-format'
  | 'missing-data';

const writeAscii = (view: DataView, offset: number, text: string) => {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
};

const readAscii = (view: DataView, offset: number, length: number) => {
  let text = '';

  for (let i = 0; i < length; i += 1) {
    text += String.fromCharCode(view.getUint8(offset + i));
  }

  return text;
};

/** The 44-byte header for `sampleCount` interleaved samples of 16-bit PCM. */
export const encodeWavHeader = (
  format: WavFormat,
  sampleCount: number,
): Uint8Array => {
  const dataBytes = sampleCount * BYTES_PER_SAMPLE;
  const bytes = new Uint8Array(WAV_HEADER_BYTES);
  const view = new DataView(bytes.buffer);
  const blockAlign = format.channels * BYTES_PER_SAMPLE;

  writeAscii(view, 0, RIFF_ID);
  view.setUint32(4, RIFF_CHUNK_OVERHEAD + dataBytes, true);
  writeAscii(view, 8, WAVE_ID);
  writeAscii(view, 12, FMT_ID);
  view.setUint32(16, FMT_CHUNK_BYTES, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, format.channels, true);
  view.setUint32(24, format.sampleRate, true);
  view.setUint32(28, format.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(view, 36, DATA_ID);
  view.setUint32(40, dataBytes, true);

  return bytes;
};

/** Little-endian bytes of Int16 samples, safe on any host endianness. */
export const int16ToBytes = (samples: Int16Array): Uint8Array => {
  const bytes = new Uint8Array(samples.length * BYTES_PER_SAMPLE);
  const view = new DataView(bytes.buffer);

  samples.forEach((sample, index) => {
    view.setInt16(index * BYTES_PER_SAMPLE, sample, true);
  });

  return bytes;
};

/** Parts to hand to `new Blob([...])`: the header, then each block's bytes. */
export const encodeWavParts = (
  blocks: readonly Int16Array[],
  format: WavFormat,
): Uint8Array[] => {
  const sampleCount = blocks.reduce((sum, block) => sum + block.length, 0);

  return [encodeWavHeader(format, sampleCount), ...blocks.map(int16ToBytes)];
};

/** Float samples in -1..1 to Int16, clamping instead of wrapping. */
export const floatToInt16 = (samples: Float32Array): Int16Array => {
  const out = new Int16Array(samples.length);

  samples.forEach((sample, index) => {
    const scaled = Math.round(sample * INT16_MAX);

    out[index] = Math.min(INT16_MAX, Math.max(INT16_MIN, scaled));
  });

  return out;
};

/** Converts into `target` starting at `offset`, so a recorder fills one buffer without allocating per block. */
export const floatToInt16Into = (
  samples: Float32Array,
  target: Int16Array,
  offset: number,
): void => {
  samples.forEach((sample, index) => {
    const scaled = Math.round(sample * INT16_MAX);

    target[offset + index] = Math.min(INT16_MAX, Math.max(INT16_MIN, scaled));
  });
};

export const int16ToFloat = (samples: Int16Array): Float32Array => {
  const out = new Float32Array(samples.length);

  samples.forEach((sample, index) => {
    out[index] = sample / INT16_MAX;
  });

  return out;
};

/**
 * Reads a 16-bit PCM WAV. Unknown chunks (LIST and the like) are skipped, and
 * a data size that overruns the file, as a streamed or truncated file has, is
 * clamped to the bytes present.
 */
export const decodeWav = (
  bytes: Uint8Array,
): { ok: true; wav: DecodedWav } | { ok: false; reason: WavDecodeFailure } => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (
    bytes.length < WAV_HEADER_BYTES - CHUNK_HEADER_BYTES ||
    readAscii(view, 0, 4) !== RIFF_ID ||
    readAscii(view, 8, 4) !== WAVE_ID
  ) {
    return { ok: false, reason: 'not-wav' };
  }

  let format: WavFormat | null = null;
  let offset = 12;

  while (offset + CHUNK_HEADER_BYTES <= bytes.length) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const body = offset + CHUNK_HEADER_BYTES;

    if (id === FMT_ID && size >= FMT_MIN_BYTES) {
      const supported =
        view.getUint16(body, true) === PCM_FORMAT &&
        view.getUint16(body + 14, true) === BITS_PER_SAMPLE;

      if (!supported) {
        return { ok: false, reason: 'unsupported-format' };
      }

      format = {
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
      };
    } else if (id === DATA_ID) {
      if (!format) {
        return { ok: false, reason: 'unsupported-format' };
      }

      const available = Math.min(size, bytes.length - body);
      const count = Math.floor(available / BYTES_PER_SAMPLE);
      const samples = new Int16Array(count);

      for (let i = 0; i < count; i += 1) {
        samples[i] = view.getInt16(body + i * BYTES_PER_SAMPLE, true);
      }

      return { ok: true, wav: { ...format, samples } };
    }

    // Chunks are word-aligned: an odd size carries one pad byte.
    offset = body + size + (size % 2);
  }

  return { ok: false, reason: 'missing-data' };
};
