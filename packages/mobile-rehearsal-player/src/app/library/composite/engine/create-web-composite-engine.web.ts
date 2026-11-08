import { SoundTouchNode } from '@soundtouchjs/audio-worklet';

import { loadProcessorModuleUrl } from '../../playback/shaping/web-pitch-shifter.web';
import {
  createOverlayLimiter,
  type LimiterContext,
} from '../../recording/overlay/overlay-limiter';
import { createCompositeEngine } from './composite-engine';
import type { CompositeEngine } from './composite-engine';
import type {
  EngineContext,
  EngineStem,
  PitchStage,
} from './composite-engine-types';

/**
 * The browser side of the composite engine: one `AudioContext`, the SoundTouch
 * node as the pitch stage and the mix limiter the export ends in, handed to the
 * engine, which owns the graph from there. Not exercised without a browser; the
 * engine itself is specced with fake contexts, and task 5.5 checks this in the
 * browser preview.
 */

export type WebCompositeContext = EngineContext &
  LimiterContext & {
    sampleRate: number;
    decodeAudioData: (audio: ArrayBuffer) => Promise<{
      numberOfChannels: number;
      sampleRate: number;
      getChannelData: (channel: number) => Float32Array;
    }>;
    audioWorklet?: { addModule: (url: string) => Promise<void> };
  };

type WebScope = {
  AudioContext?: new () => WebCompositeContext;
  AudioWorkletNode?: unknown;
};

let sharedContext: WebCompositeContext | null = null;

/** One output context for every composite, created on first use after a user action. */
export const getCompositeAudioContext = (): WebCompositeContext | null => {
  const Constructor = (globalThis as WebScope).AudioContext;

  if (!Constructor) {
    return null;
  }

  sharedContext ??= new Constructor();

  return sharedContext;
};

// The processor registers once per context; a failure is remembered so a
// device that cannot load it is not asked again on every composite.
const processorLoads = new WeakMap<object, Promise<boolean>>();

const registerPitchProcessor = (context: WebCompositeContext) => {
  const cached = processorLoads.get(context);

  if (cached) {
    return cached;
  }

  const load = (async () => {
    if (!(globalThis as WebScope).AudioWorkletNode) {
      return false;
    }

    try {
      const moduleUrl = await loadProcessorModuleUrl();

      try {
        await SoundTouchNode.register(context as never, moduleUrl);
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }

      return true;
    } catch {
      return false;
    }
  })();

  processorLoads.set(context, load);

  return load;
};

/**
 * The pitch node for the summed stems, or null where worklets are not available
 * (the engine then lets the speed move the pitch too). The source voices play at
 * the rate; the node is told the same rate so it compensates for it (spike 1.2).
 */
const createPitchStage = async (
  context: WebCompositeContext,
): Promise<PitchStage | null> => {
  if (!(await registerPitchProcessor(context))) {
    return null;
  }

  try {
    const node = new SoundTouchNode({ context: context as never });

    return {
      input: node as never,
      output: node as never,
      update: ({ rate, pitchSemitones }) => {
        node.playbackRate.value = rate;
        node.pitchSemitones.value = pitchSemitones;
      },
      dispose: () =>
        (node as unknown as { disconnect: () => void }).disconnect(),
    };
  } catch {
    return null;
  }
};

/** Builds the engine for stems that have loaded. */
export const createWebCompositeEngine = async (options: {
  stems: EngineStem[];
  initialGains: Record<string, number>;
}): Promise<CompositeEngine> => {
  const context = getCompositeAudioContext();

  if (!context) {
    throw new Error(
      'This browser does not support the audio features composites need.',
    );
  }

  const [pitchStage, limiter] = await Promise.all([
    createPitchStage(context),
    createOverlayLimiter(context),
  ]);

  return createCompositeEngine({
    context,
    stems: options.stems,
    initialGains: options.initialGains,
    limiter: limiter as never,
    pitchStage,
  });
};
