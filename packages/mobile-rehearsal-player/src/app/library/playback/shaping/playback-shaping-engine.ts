import type {
  PlaybackPitchShifter,
  PlaybackShapingEngine,
  PlaybackShapingPlayer,
  PlaybackShapingState,
  SpeedTransform,
} from './playback-shaping-types';

const NEUTRAL_SPEED_MULTIPLIER = 1;
const NEUTRAL_PITCH_SEMITONES = 0;

/** Raised for the `tempoMap` branch, which is modeled but not implemented. */
export class UnsupportedSpeedTransformError extends Error {
  constructor(kind: SpeedTransform['kind']) {
    super(`Speed transform "${kind}" is not implemented yet.`);
    this.name = 'UnsupportedSpeedTransformError';
  }
}

type CreatePlaybackShapingEngineOptions = {
  player: PlaybackShapingPlayer;
  /** Present only where the platform can shift pitch without changing tempo. */
  pitchShifter: PlaybackPitchShifter | null;
};

// Callers clamp to the product ranges (task 5.2); the engine only refuses
// values no player could honor.
const assertPositiveFinite = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
};

const assertWholeSemitones = (semitones: number) => {
  if (!Number.isInteger(semitones)) {
    throw new RangeError('Pitch must be a whole number of semitones.');
  }
};

export const createPlaybackShapingEngine = ({
  pitchShifter,
  player,
}: CreatePlaybackShapingEngineOptions): PlaybackShapingEngine => {
  let state: PlaybackShapingState = {
    pitchSemitones: NEUTRAL_PITCH_SEMITONES,
    speed: { kind: 'multiplier', multiplier: NEUTRAL_SPEED_MULTIPLIER },
  };

  const setSpeed = async (transform: SpeedTransform) => {
    if (transform.kind !== 'multiplier') {
      throw new UnsupportedSpeedTransformError(transform.kind);
    }

    assertPositiveFinite(transform.multiplier, 'Speed multiplier');
    // Pitch-preserving on every platform: web `playbackRate` keeps pitch
    // (`preservesPitch`), iOS needs the track's Music pitch algorithm, and
    // Android ExoPlayer speed leaves pitch at 1.0.
    await player.setRate(transform.multiplier);
    state = { ...state, speed: transform };
  };

  const setPitchSemitones = async (semitones: number) => {
    assertWholeSemitones(semitones);

    // No-op, never an approximation: changing pitch by changing rate would
    // also change tempo (see `canShapePitchOnPlatform`).
    if (!pitchShifter) {
      return { applied: false };
    }

    await pitchShifter.setSemitones(semitones);
    state = { ...state, pitchSemitones: semitones };

    return { applied: true };
  };

  return {
    canShapePitch: pitchShifter !== null,
    getState: () => state,
    reset: async () => {
      await setSpeed({
        kind: 'multiplier',
        multiplier: NEUTRAL_SPEED_MULTIPLIER,
      });
      await setPitchSemitones(NEUTRAL_PITCH_SEMITONES);
    },
    setPitchSemitones,
    setSpeed,
    setSpeedMultiplier: (multiplier) => {
      return setSpeed({ kind: 'multiplier', multiplier });
    },
  };
};
