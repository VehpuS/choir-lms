import { createCeilingCurve } from '@org/audio-mixing';

/**
 * The limiter on the recording's own output (rehearsal-recording design
 * Decision 21): a compressor with a high ratio and a fast attack that evens out
 * peaks, then a ceiling curve that no sample can pass, so a boosted recording
 * never clips by itself. The ceiling is defined once, in `@org/audio-mixing`,
 * and the exported mix ends in the same one. The compressor alone is not a ceiling (the browser
 * adds make-up gain, and a +18 dB boost still overshoots), hence the curve. It
 * covers the recording only; the track reaches the browser's output through
 * the media element, so the sum of the two is limited only in an exported mix.
 */

/** The level above which the compressor starts to act, a little under full scale. */
export const LIMITER_THRESHOLD_DB = -1.5;
export const LIMITER_KNEE_DB = 0;
/** The highest ratio the node allows, which makes it act as a limiter. */
export const LIMITER_RATIO = 20;
/** Seconds; short enough to catch a peak before it is heard as clipping. */
export const LIMITER_ATTACK_S = 0.002;
export const LIMITER_RELEASE_S = 0.12;
type LimiterParam = { value: number };

type ConnectableNode = {
  connect: (destination: unknown) => unknown;
  disconnect: () => void;
};

/** The slice of the browser's `DynamicsCompressorNode` the limiter sets. */
export type CompressorNode = ConnectableNode & {
  threshold: LimiterParam;
  knee: LimiterParam;
  ratio: LimiterParam;
  attack: LimiterParam;
  release: LimiterParam;
};

/** The slice of the browser's `WaveShaperNode` the limiter sets. */
export type ShaperNode = ConnectableNode & {
  curve: Float32Array | null;
  oversample: string;
};

export type LimiterContext = {
  createDynamicsCompressor: () => CompressorNode;
  createWaveShaper: () => ShaperNode;
};

/** A limiter: connect into `input`, and `output` onward. */
export type Limiter = {
  input: ConnectableNode;
  output: ConnectableNode;
  disconnect: () => void;
};

export const createOverlayLimiter = (context: LimiterContext): Limiter => {
  const compressor = context.createDynamicsCompressor();
  const ceiling = context.createWaveShaper();

  compressor.threshold.value = LIMITER_THRESHOLD_DB;
  compressor.knee.value = LIMITER_KNEE_DB;
  compressor.ratio.value = LIMITER_RATIO;
  compressor.attack.value = LIMITER_ATTACK_S;
  compressor.release.value = LIMITER_RELEASE_S;
  ceiling.curve = createCeilingCurve();
  ceiling.oversample = '2x';
  compressor.connect(ceiling);

  return {
    disconnect: () => {
      compressor.disconnect();
      ceiling.disconnect();
    },
    input: compressor,
    output: ceiling,
  };
};
