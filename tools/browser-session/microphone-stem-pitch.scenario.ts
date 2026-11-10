import { midiToNoteName } from '@org/audio-library-models';
import {
  createPitchPipeline,
  createPitchyEstimator,
} from '@org/pitch-detection';

import { CHOIR_STEM_NOTES } from '../../packages/mobile-rehearsal-player/src/test-support/fixtures/choir-fixtures';
import { buildDefaultMockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import {
  captureMicrophoneFrames,
  type MicrophoneCapture,
} from './fake-microphone';
import { runScenario } from './scenario-runner';

// Proves the fake microphone: the page's microphone stream carries the choir
// stem, and the shipped pitch pipeline reads E4, C#4, C4 from it. The device
// loops the 3.3 s file, so we listen across two loops and look for the
// sequence rather than depend on where the capture happened to start.
const CAPTURE_SECONDS = 8;
// What the stem actually does (measured): E4 held for about 0.3 s, a slide
// down through D#4, D4 and C#4 (C#4 only for about 0.1 s), then C4 held. So the
// note segmenter, which wants 80 ms of stability, reports E4 then C4, while
// the raw frames also pass through C#4.
const SEGMENTED_NOTES = ['E4', 'C4'] as const;
const MIN_FRAME_LEVEL = 0.02;
const MIN_FRAME_CLARITY = 0.8;
const A4_MIDI = 69;
const A4_HZ = 440;
const SEMITONES_PER_OCTAVE = 12;

/** The distinct notes the pipeline reads, in order. */
const readNotes = ({ frames, sampleRate }: MicrophoneCapture): string[] => {
  const pipeline = createPitchPipeline({ estimator: createPitchyEstimator() });
  const seen = new Map<number, string>();

  frames.forEach((samples, index) => {
    const reading = pipeline.process({
      samples,
      sampleRate,
      timestampMs: ((index + 1) * samples.length * 1000) / sampleRate,
    });

    if (reading.active && !seen.has(reading.noteId)) {
      seen.set(reading.noteId, midiToNoteName(reading.midi));
    }
  });

  return [...seen.values()];
};

/** The note of each clear, audible frame, repeats collapsed. */
const readFrameNotes = ({
  frames,
  sampleRate,
}: MicrophoneCapture): string[] => {
  const estimator = createPitchyEstimator();
  const notes: string[] = [];

  for (const samples of frames) {
    const level = Math.sqrt(
      samples.reduce((sum, sample) => sum + sample * sample, 0) /
        samples.length,
    );
    const estimate =
      level >= MIN_FRAME_LEVEL ? estimator.estimate(samples, sampleRate) : null;

    if (estimate && estimate.clarity >= MIN_FRAME_CLARITY) {
      const midi = Math.round(
        A4_MIDI +
          SEMITONES_PER_OCTAVE * Math.log2(estimate.frequencyHz / A4_HZ),
      );
      const name = midiToNoteName(midi);

      if (notes[notes.length - 1] !== name) {
        notes.push(name);
      }
    }
  }

  return notes;
};

const containsInOrder = (notes: string[], expected: readonly string[]) => {
  let next = 0;

  for (const note of notes) {
    if (note === expected[next]) {
      next += 1;
    }
  }

  return next === expected.length;
};

void runScenario({
  library: buildDefaultMockLibrary(),
  microphone: true,
  steps: async ({ page, pass }) => {
    const capture = await captureMicrophoneFrames(page, CAPTURE_SECONDS);
    const segmented = readNotes(capture);
    const frames = readFrameNotes(capture);

    console.log(`segmented: ${segmented.join(' ')}`);
    console.log(`frames: ${frames.join(' ')}`);

    if (!containsInOrder(segmented, SEGMENTED_NOTES)) {
      throw new Error(
        `the pitch pipeline should read ${SEGMENTED_NOTES.join(', ')}, read ${segmented.join(' ')}`,
      );
    }

    pass('the pitch pipeline reads E4 then C4 from the fake microphone');

    if (!containsInOrder(frames, CHOIR_STEM_NOTES)) {
      throw new Error(
        `the frames should pass ${CHOIR_STEM_NOTES.join(', ')}, read ${frames.join(' ')}`,
      );
    }

    pass('the raw frames pass through E4, C#4, C4 in order');
  },
});
