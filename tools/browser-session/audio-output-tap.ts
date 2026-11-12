import type { BrowserContext, Page } from 'playwright';

// Copies what the page sends to the speakers into a buffer the scenario can
// read, so audio quality can be measured instead of listened to. Installed
// before any app code runs:
//
// - `AudioContext` is wrapped so every context the app creates can be forced
//   to a device sample rate (to simulate other hardware).
// - Anything connected to a context's `destination` is also connected to a
//   recorder, which stores the mono mix.
//
// Only audio that goes through Web Audio is seen, which is the pitch-shifted
// path (the SoundTouch worklet). Plain media-element playback does not pass
// through Web Audio; assert that through the element instead.
const TAP_BLOCK_SAMPLES = 4096;

export type AudioOutput = { sampleRate: number; samples: Float32Array };

/**
 * The page-side script, as a plain string: a function passed to
 * `addInitScript` would be serialised after tsx has added helper calls
 * (`__name`) that do not exist in the page.
 */
const buildTapScript = (blockSamples: number, forcedSampleRate: number) => `
(() => {
  const state = { blocks: [], sampleRate: 0 };
  window.__audioTap = state;

  const BaseContext = window.AudioContext;
  const forced = ${forcedSampleRate};
  const originalConnect = AudioNode.prototype.connect;
  // Runs on the audio thread, so a busy page cannot make it drop audio (a
  // main-thread script processor does, which reads as clicks). It mixes to
  // mono and posts blocks of ${blockSamples} samples.
  const processorSource = \`
    class AudioTap extends AudioWorkletProcessor {
      constructor() {
        super();
        this.block = new Float32Array(${blockSamples});
        this.filled = 0;
      }
      process(inputs) {
        const input = inputs[0];

        if (input.length === 0) {
          return true;
        }

        const frames = input[0].length;

        for (let frame = 0; frame < frames; frame += 1) {
          let sum = 0;

          for (let channel = 0; channel < input.length; channel += 1) {
            sum += input[channel][frame];
          }

          this.block[this.filled] = sum / input.length;
          this.filled += 1;

          if (this.filled === this.block.length) {
            this.port.postMessage(this.block);
            this.block = new Float32Array(this.block.length);
            this.filled = 0;
          }
        }

        return true;
      }
    }
    registerProcessor('audio-tap', AudioTap);
  \`;
  const moduleUrl = URL.createObjectURL(
    new Blob([processorSource], { type: 'text/javascript' }),
  );

  class TappedAudioContext extends BaseContext {
    constructor(contextOptions) {
      super(forced ? { ...contextOptions, sampleRate: forced } : contextOptions);
      state.sampleRate = this.sampleRate;
      // Sources wired to the speakers before the worklet has loaded (a few
      // milliseconds) are attached to the tap as soon as it is ready.
      this.__tapWaiting = new Set();
      this.__tapNode = null;
      this.audioWorklet.addModule(moduleUrl).then(() => {
        const node = new AudioWorkletNode(this, 'audio-tap', {
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        const silent = this.createGain();

        silent.gain.value = 0;
        node.port.onmessage = (event) => state.blocks.push(event.data);
        originalConnect.call(node, silent);
        originalConnect.call(silent, this.destination);
        this.__tapNode = node;
        this.__tapWaiting.forEach((source) => originalConnect.call(source, node));
        this.__tapWaiting.clear();
      });
    }
  }

  AudioNode.prototype.connect = function (destination, ...rest) {
    const result = originalConnect.call(this, destination, ...rest);
    const owner = this.context;

    if (owner.__tapWaiting && destination === owner.destination) {
      if (owner.__tapNode) {
        originalConnect.call(this, owner.__tapNode);
      } else {
        owner.__tapWaiting.add(this);
      }
    }

    return result;
  };

  window.AudioContext = TappedAudioContext;
})();
`;

export const installAudioOutputTap = async (
  context: BrowserContext,
  options: { sampleRate?: number } = {},
) => {
  await context.addInitScript(
    buildTapScript(TAP_BLOCK_SAMPLES, options.sampleRate ?? 0),
  );
};

/** Forgets what was captured so far. */
export const resetAudioOutput = (page: Page) =>
  page.evaluate(() => {
    (
      window as unknown as { __audioTap: { blocks: unknown[] } }
    ).__audioTap.blocks = [];
  });

/**
 * Whether anything audible has reached the speakers since the last reset,
 * decided inside the page: nothing is copied out, so it is cheap to poll (copying
 * the capture out, as `readAudioOutput` does, stalled the page in WebKit).
 */
export const hasAudioSignal = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const tap = (
      window as unknown as { __audioTap: { blocks: Float32Array[] } }
    ).__audioTap;
    let peak = 0;

    for (const block of tap.blocks) {
      for (let index = 0; index < block.length; index += 1) {
        peak = Math.max(peak, Math.abs(block[index]));
      }
    }

    return peak > 0.005;
  });

/** What reached the speakers since the last reset, as one mono signal. */
export const readAudioOutput = async (page: Page): Promise<AudioOutput> => {
  const captured = await page.evaluate(() => {
    const tap = (
      window as unknown as {
        __audioTap: { blocks: Float32Array[]; sampleRate: number };
      }
    ).__audioTap;
    const total = tap.blocks.reduce((sum, block) => sum + block.length, 0);
    const joined = new Float32Array(total);
    let offset = 0;

    for (const block of tap.blocks) {
      joined.set(block, offset);
      offset += block.length;
    }

    // Float32 bytes as base64: far smaller than a JSON array of numbers.
    let binary = '';
    const bytes = new Uint8Array(joined.buffer);
    const chunk = 0x8000;

    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
    }

    return { base64: btoa(binary), sampleRate: tap.sampleRate };
  });
  const buffer = Buffer.from(captured.base64, 'base64');

  return {
    sampleRate: captured.sampleRate,
    samples: new Float32Array(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length),
    ),
  };
};
