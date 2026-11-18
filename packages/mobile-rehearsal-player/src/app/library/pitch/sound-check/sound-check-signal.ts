import { encodeWavHeader } from '@org/audio-mixing';

/**
 * The test sound of the Sound check (clear-playback-while-listening): four
 * seconds that make a narrowband or mono Bluetooth route obvious by ear.
 *  - 0 to 1 s: a rich tone (220 Hz and its harmonics up to 7 kHz) on the left only;
 *  - 1 to 2 s: the same on the right only;
 *  - 2 to 3 s: a stepped sweep of sines (0.5, 1, 2, 4, 6 and 8 kHz) on both;
 *  - 3 to 4 s: silence, so a loop has a clear start.
 * A thin call-mode route drops the side that is not centred, loses the harmonic
 * brightness, and cuts the sweep off at 4 kHz (or 8 kHz when wideband).
 */

export const SOUND_CHECK_SECONDS = 4;
const SEGMENT_SECONDS = 1;
const PEAK = 0.3;
const FUNDAMENTAL_HZ = 220;
const HIGHEST_HARMONIC_HZ = 7000;
const SWEEP_HZ = [500, 1000, 2000, 4000, 6000, 8000] as const;
const FADE_SECONDS = 0.01;
const INT16_MAX = 0x7fff;
const STEREO = 2;

export type SoundCheckSignal = {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
};

const harmonic = (timeSec: number) => {
  let sum = 0;

  for (let k = 1; FUNDAMENTAL_HZ * k <= HIGHEST_HARMONIC_HZ; k += 1) {
    sum += Math.sin(2 * Math.PI * FUNDAMENTAL_HZ * k * timeSec) / k;
  }

  return sum;
};

/** A short fade at both ends of a segment, so steps do not click. */
const fade = (positionSec: number, lengthSec: number) =>
  Math.min(
    1,
    positionSec / FADE_SECONDS,
    (lengthSec - positionSec) / FADE_SECONDS,
  );

export const buildSoundCheckSignal = (sampleRate: number): SoundCheckSignal => {
  const frames = Math.round(sampleRate * SOUND_CHECK_SECONDS);
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const sweepStep = SEGMENT_SECONDS / SWEEP_HZ.length;
  let peak = 0;

  for (let index = 0; index < frames; index += 1) {
    const timeSec = index / sampleRate;
    const segment = Math.floor(timeSec / SEGMENT_SECONDS);
    const inSegment = timeSec - segment * SEGMENT_SECONDS;
    const edge = fade(inSegment, SEGMENT_SECONDS);

    if (segment === 0) {
      left[index] = harmonic(timeSec) * edge;
    } else if (segment === 1) {
      right[index] = harmonic(timeSec) * edge;
    } else if (segment === 2) {
      const step = Math.min(
        SWEEP_HZ.length - 1,
        Math.floor(inSegment / sweepStep),
      );
      const inStep = inSegment - step * sweepStep;
      const value =
        Math.sin(2 * Math.PI * SWEEP_HZ[step] * timeSec) *
        fade(inStep, sweepStep);

      left[index] = value;
      right[index] = value;
    }

    peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
  }

  const gain = peak > 0 ? PEAK / peak : 1;

  for (let index = 0; index < frames; index += 1) {
    left[index] *= gain;
    right[index] *= gain;
  }

  return { left, right, sampleRate };
};

const toInt16 = (value: number) =>
  Math.round(Math.max(-1, Math.min(1, value)) * INT16_MAX);

/** A stereo 16-bit WAV of the signal, for the media element to play. */
export const encodeSoundCheckWav = (signal: SoundCheckSignal): Uint8Array => {
  const frames = signal.left.length;
  const samples = new Int16Array(frames * STEREO);

  for (let index = 0; index < frames; index += 1) {
    samples[index * STEREO] = toInt16(signal.left[index]);
    samples[index * STEREO + 1] = toInt16(signal.right[index]);
  }

  const header = encodeWavHeader(
    { sampleRate: signal.sampleRate, channels: STEREO },
    samples.length,
  );
  const bytes = new Uint8Array(header.length + samples.byteLength);

  bytes.set(header, 0);
  bytes.set(new Uint8Array(samples.buffer), header.length);

  return bytes;
};
