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
const TAP_BUFFER_SAMPLES = 4096;

export type AudioOutput = { sampleRate: number; samples: Float32Array };

/**
 * The page-side script, as a plain string: a function passed to
 * `addInitScript` would be serialised after tsx has added helper calls
 * (`__name`) that do not exist in the page.
 */
const buildTapScript = (bufferSamples: number, forcedSampleRate: number) => `
(() => {
  const state = { blocks: [], sampleRate: 0 };
  window.__audioTap = state;

  const BaseContext = window.AudioContext;
  const forced = ${forcedSampleRate};

  class TappedAudioContext extends BaseContext {
    constructor(contextOptions) {
      super(forced ? { ...contextOptions, sampleRate: forced } : contextOptions);
      state.sampleRate = this.sampleRate;

      // A script processor only runs when connected onward, so it goes
      // through a silent gain; what it copies is the mono mix.
      const recorder = this.createScriptProcessor(${bufferSamples}, 2, 1);
      const silent = this.createGain();

      silent.gain.value = 0;
      recorder.onaudioprocess = (event) => {
        const left = event.inputBuffer.getChannelData(0);
        const right =
          event.inputBuffer.numberOfChannels > 1
            ? event.inputBuffer.getChannelData(1)
            : left;

        state.blocks.push(
          Float32Array.from(left, (sample, index) => (sample + right[index]) / 2),
        );
      };
      recorder.connect(silent);
      silent.connect(this.destination);
      this.__tapInput = recorder;
    }
  }

  const originalConnect = AudioNode.prototype.connect;

  AudioNode.prototype.connect = function (destination, ...rest) {
    const result = originalConnect.call(this, destination, ...rest);
    const tapInput = this.context.__tapInput;

    if (tapInput && destination === this.context.destination && this !== tapInput) {
      originalConnect.call(this, tapInput);
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
    buildTapScript(TAP_BUFFER_SAMPLES, options.sampleRate ?? 0),
  );
};

/** Forgets what was captured so far. */
export const resetAudioOutput = (page: Page) =>
  page.evaluate(() => {
    (
      window as unknown as { __audioTap: { blocks: unknown[] } }
    ).__audioTap.blocks = [];
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
