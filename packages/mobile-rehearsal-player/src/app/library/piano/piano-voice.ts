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
