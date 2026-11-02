import { createClickTemplate } from '@org/audio-mixing';

import type { ClickOutput } from './click-calibration-run';
import { getOverlayContext } from './recording-overlay.web';

const MS_PER_SECOND = 1000;
/** Loud enough to reach a microphone from speakers, short of clipping. */
const CLICK_GAIN = 0.8;

type ClickSource = {
  buffer: unknown;
  connect: (node: unknown) => void;
  start: (when: number) => void;
  stop: () => void;
};

/** The parts of `AudioContext` the clicks need beyond what the overlay declares. */
type ClickContext = {
  currentTime: number;
  sampleRate: number;
  destination: unknown;
  resume: () => Promise<void>;
  createBuffer: (
    channels: number,
    length: number,
    sampleRate: number,
  ) => { getChannelData: (channel: number) => Float32Array };
  createBufferSource: () => ClickSource;
};

/**
 * Plays the clicks on the same output context the overlay uses, so the delay
 * measured is the one a recording is played through. A click's hand-over time
 * is the context time it was scheduled for, mapped to `performance.now()`
 * with one reading of both clocks.
 */
export const createClickOutput = (): ClickOutput | null => {
  const context = getOverlayContext() as unknown as ClickContext | null;

  if (!context) {
    return null;
  }

  let sources: ClickSource[] = [];

  return {
    schedule: async (offsetsMs) => {
      // The user pressed the button, so the context may resume; a suspended one is silent.
      await context.resume().catch(() => undefined);

      const template = createClickTemplate(context.sampleRate);
      const buffer = context.createBuffer(
        1,
        template.length,
        context.sampleRate,
      );

      buffer.getChannelData(0).set(template.map((v) => v * CLICK_GAIN));

      const contextNow = context.currentTime;
      const wallNow = performance.now();

      sources = offsetsMs.map((offset) => {
        const source = context.createBufferSource();

        source.buffer = buffer;
        source.connect(context.destination);
        source.start(contextNow + offset / MS_PER_SECOND);

        return source;
      });

      return offsetsMs.map((offset) => wallNow + offset);
    },
    cancel: () => {
      sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // A click that already played cannot be stopped again.
        }
      });
      sources = [];
    },
  };
};
