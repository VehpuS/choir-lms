/** A sounding note; `release` starts its tail and is safe to call twice. */
export type PianoNoteHandle = {
  release: () => void;
};

/**
 * One way of making piano-key sound. The web voices own their own audio
 * context, separate from playback shaping, so the output device mixes the
 * piano on top of the track and the track's gain is never touched.
 */
export type PianoVoice = {
  /** Fetches whatever the voice needs; resolves when it can sound. */
  load: () => Promise<void>;
  /** `velocity` is 0–1. */
  noteOn: (midi: number, velocity: number) => PianoNoteHandle;
  /** 0–1, applied to notes already sounding as well as new ones. */
  setVolume: (volume: number) => void;
  dispose: () => void;
};

/** At most this many notes sound at once; the oldest is released first. */
export const MAX_PIANO_VOICES = 10;

/** Up to here the slider maps straight to gain, as it always has. */
const UNITY_VOLUME = 0.7;
/** Gain at the slider's top, so the piano can be heard over a loud track. */
const MAX_VOLUME_GAIN = 3;

/**
 * Maps the 0–1 slider to master gain. Below `UNITY_VOLUME` it is linear, so
 * existing levels sound the same; above it the gain climbs to `MAX_VOLUME_GAIN`.
 */
export const pianoVolumeToGain = (volume: number): number => {
  if (volume <= UNITY_VOLUME) return volume;
  const boostShare = (volume - UNITY_VOLUME) / (1 - UNITY_VOLUME);
  return UNITY_VOLUME + boostShare * (MAX_VOLUME_GAIN - UNITY_VOLUME);
};
