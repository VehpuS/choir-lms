import {
  DEFAULT_REFERENCE_HZ,
  frequencyToSungPitch,
  midiToFrequency,
} from '@org/audio-library-models';

import { createMedianSmoother } from './median-smoother.ts';
import { createNoteSegmenter } from './note-segmenter.ts';
import type { PitchEstimator } from './pitch-estimator.ts';
import {
  DEFAULT_SENSITIVITY,
  GATES_BY_SENSITIVITY,
  MAX_VOICE_HZ,
  MIN_VOICE_HZ,
  rootMeanSquare,
  type Sensitivity,
} from './sensitivity.ts';

const CENTS_PER_SEMITONE = 100;

export type PitchFrame = {
  samples: Float32Array;
  sampleRate: number;
  /** Capture time in milliseconds on any monotonic clock. */
  timestampMs: number;
};

export type PitchReading =
  | { active: false }
  | {
      active: true;
      /** True while the last note is kept through a gap with no pitch. */
      held: boolean;
      /** The nearest note and the offset from it (within ±50 cents). */
      midi: number;
      cents: number;
      frequencyHz: number;
      clarity: number;
      /** Identifies the segmented note this reading belongs to. */
      noteId: number;
      noteStartMs: number;
    };

export type PitchPipeline = {
  process: (frame: PitchFrame) => PitchReading;
  setSensitivity: (sensitivity: Sensitivity) => void;
  setReferenceHz: (referenceHz: number) => void;
  reset: () => void;
};

type Voiced = { midi: number; clarity: number };

export const createPitchPipeline = ({
  estimator,
  sensitivity = DEFAULT_SENSITIVITY,
  referenceHz = DEFAULT_REFERENCE_HZ,
}: {
  estimator: PitchEstimator;
  sensitivity?: Sensitivity;
  referenceHz?: number;
}): PitchPipeline => {
  const smoother = createMedianSmoother();
  const segmenter = createNoteSegmenter();
  let gates = GATES_BY_SENSITIVITY[sensitivity];
  let reference = referenceHz;
  let lastDisplay: Extract<PitchReading, { active: true }> | null = null;

  // Level gate, estimator, clarity gate and range gate: a fractional MIDI
  // note when the frame is clearly a voice, otherwise null.
  const detect = (frame: PitchFrame): Voiced | null => {
    if (rootMeanSquare(frame.samples) < gates.minRms) {
      return null;
    }

    const estimate = estimator.estimate(frame.samples, frame.sampleRate);

    if (
      !estimate ||
      estimate.clarity < gates.minClarity ||
      estimate.frequencyHz < MIN_VOICE_HZ ||
      estimate.frequencyHz > MAX_VOICE_HZ
    ) {
      return null;
    }

    const sung = frequencyToSungPitch(estimate.frequencyHz, reference);

    return sung
      ? {
          midi: sung.midi + sung.cents / CENTS_PER_SEMITONE,
          clarity: estimate.clarity,
        }
      : null;
  };

  return {
    process: (frame) => {
      const voiced = detect(frame);
      const smoothed = voiced ? smoother.push(voiced.midi) : null;
      const { note } = segmenter.push(frame.timestampMs, smoothed);

      if (!note) {
        // Keep the smoother while a first note is still stabilising; start
        // afresh only once a gap has ended with no note.
        if (!voiced) {
          smoother.reset();
        }
        lastDisplay = null;

        return { active: false };
      }

      if (voiced && smoothed !== null) {
        const midi = Math.round(smoothed);

        lastDisplay = {
          active: true,
          held: false,
          midi,
          cents: (smoothed - midi) * CENTS_PER_SEMITONE,
          frequencyHz: midiToFrequency(smoothed, reference),
          clarity: voiced.clarity,
          noteId: note.id,
          noteStartMs: note.startMs,
        };

        return lastDisplay;
      }

      // No pitch this frame: keep showing the last reading, marked as held.
      return lastDisplay ? { ...lastDisplay, held: true } : { active: false };
    },
    setSensitivity: (next) => {
      gates = GATES_BY_SENSITIVITY[next];
    },
    setReferenceHz: (next) => {
      reference = next;
      smoother.reset();
    },
    reset: () => {
      smoother.reset();
      segmenter.reset();
      lastDisplay = null;
    },
  };
};
