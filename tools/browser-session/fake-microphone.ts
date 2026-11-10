import { chromium, type Page } from 'playwright';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { encodePcmWav } from '../../packages/mobile-rehearsal-player/src/test-support/audio/pcm-wav';
import {
  CHOIR_STEM_FILE,
  readFixtureBytes,
} from '../../packages/mobile-rehearsal-player/src/test-support/fixtures/choir-fixtures';

// A fake microphone for Chromium: the browser's own fake capture device plays
// a WAV file in a loop as the microphone stream, so recording and pitch flows
// get a real `MediaStream` carrying a known signal (the choir stem) with no
// audio hardware. Chromium-only: the flags and the file format are Chromium's.
const STEM_SAMPLE_RATE = 16_000;
const CAPTURE_FRAME_SAMPLES = 2048;

let cachedStemWavPath: string | undefined;

/**
 * Decodes the stem in a throwaway browser (so CI needs no ffmpeg) and writes
 * it as the WAV the fake device wants. Cached for the process.
 */
export const prepareStemMicrophoneWav = async (): Promise<string> => {
  if (cachedStemWavPath) {
    return cachedStemWavPath;
  }

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    const samples = await page.evaluate(
      async ({ base64, sampleRate }) => {
        const bytes = Uint8Array.from(atob(base64), (char) =>
          char.charCodeAt(0),
        );
        // Decoding into a 16 kHz offline context resamples to that rate.
        const context = new OfflineAudioContext(1, 1, sampleRate);
        const decoded = await context.decodeAudioData(bytes.buffer);

        return Array.from(decoded.getChannelData(0));
      },
      {
        base64: readFixtureBytes(CHOIR_STEM_FILE).toString('base64'),
        sampleRate: STEM_SAMPLE_RATE,
      },
    );
    const path = join(mkdtempSync(join(tmpdir(), 'fake-mic-')), 'stem.wav');

    writeFileSync(path, encodePcmWav(samples, STEM_SAMPLE_RATE));
    cachedStemWavPath = path;

    return path;
  } finally {
    await browser.close();
  }
};

/** Chromium flags that make `getUserMedia` answer with the WAV, with no prompt. */
export const fakeMicrophoneLaunchArgs = (wavPath: string): string[] => [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  `--use-file-for-fake-audio-capture=${wavPath}`,
];

export type MicrophoneCapture = {
  /** Consecutive blocks of mono samples, in capture order. */
  frames: Float32Array[];
  sampleRate: number;
};

/** Records the microphone stream for `seconds` and returns what the page heard. */
export const captureMicrophoneFrames = async (
  page: Page,
  seconds: number,
): Promise<MicrophoneCapture> => {
  const captured = await page.evaluate(
    async ({ frameSamples, ms }) => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      // Deprecated but dependency-free, and enough to copy raw blocks out.
      const tap = context.createScriptProcessor(frameSamples, 1, 1);
      const blocks: number[][] = [];

      tap.onaudioprocess = (event) => {
        blocks.push(Array.from(event.inputBuffer.getChannelData(0)));
      };
      source.connect(tap);
      tap.connect(context.destination);
      await new Promise((resolve) => setTimeout(resolve, ms));
      stream.getTracks().forEach((track) => track.stop());
      await context.close();

      return { blocks, sampleRate: context.sampleRate };
    },
    { frameSamples: CAPTURE_FRAME_SAMPLES, ms: seconds * 1000 },
  );

  return {
    frames: captured.blocks.map((block) => Float32Array.from(block)),
    sampleRate: captured.sampleRate,
  };
};
