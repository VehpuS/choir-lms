/** One point of a future tempo map: from `sourceTimeMs` on, play at `rate`. */
export type TempoMapPoint = {
  rate: number;
  sourceTimeMs: number;
};

/**
 * How playback speed is shaped. Only the scalar branch is implemented; the
 * tempo map exists so score-follow (design Decision 7) adds an implementation
 * instead of changing every caller's type.
 */
export type SpeedTransform =
  | { kind: 'multiplier'; multiplier: number }
  | { kind: 'tempoMap'; points: readonly TempoMapPoint[] };

export type PlaybackShapingState = {
  pitchSemitones: number;
  speed: SpeedTransform;
};

export type SetPitchResult = {
  /** False when the platform cannot shift pitch (see `canShapePitch`). */
  applied: boolean;
};

/** The slice of the track player the engine needs (react-native-track-player). */
export type PlaybackShapingPlayer = {
  setRate: (rate: number) => Promise<void>;
};

/** A pitch shifter that never changes tempo; only the web build has one. */
export type PlaybackPitchShifter = {
  setSemitones: (semitones: number) => Promise<void>;
};

export type PlaybackShapingEngine = {
  /** Whether `setPitchSemitones` can change anything on this platform. */
  canShapePitch: boolean;
  getState: () => PlaybackShapingState;
  /** Back to 1.00× and 0 st without interrupting playback. */
  reset: () => Promise<void>;
  setPitchSemitones: (semitones: number) => Promise<SetPitchResult>;
  setSpeed: (transform: SpeedTransform) => Promise<void>;
  setSpeedMultiplier: (multiplier: number) => Promise<void>;
};
