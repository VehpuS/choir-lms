import { SoundTouchNode } from '@soundtouchjs/audio-worklet';
import { Asset } from 'expo-asset';

import { canShapePitchOnPlatform } from './playback-shaping-capabilities';
import type { PlaybackPitchShifter } from './playback-shaping-types';
import {
  createWebPitchShifter,
  type WebPitchShifterDependencies,
} from './web-pitch-shifter-core';

// The AudioWorklet processor ships as a Metro asset (`worklet` is in
// `assetExts`) because the worklet scope loads it by URL, not from the bundle.
// `soundtouch-processor-asset.spec.ts` keeps it identical to the package's.
const processorAsset = require('../../../../../assets/audio/soundtouch-processor.worklet');

const PROCESSOR_MIME_TYPE = 'text/javascript';

// The app's TypeScript config carries no DOM library, so the slice of the
// browser API used here is described structurally (as in `peak-extractor.web`).
type WebAudioContext = Parameters<
  WebPitchShifterDependencies['createPitchNode']
>[0];

type WebScope = {
  AudioContext?: new () => WebAudioContext;
  AudioWorkletNode?: unknown;
  window?: {
    rntp?: {
      getMediaElement?: () => { preservesPitch?: boolean } | null;
    };
  };
};

const getWebScope = () => globalThis as unknown as WebScope;

// `addModule` rejects scripts served without a JavaScript MIME type, and the
// dev server serves unknown asset extensions as octet-stream.
const loadProcessorModuleUrl = async () => {
  const processorUrl = Asset.fromModule(processorAsset).uri;
  const response = await fetch(processorUrl);

  if (!response.ok) {
    throw new Error(`Pitch processor failed to load (${response.status}).`);
  }

  const source = await response.text();

  return URL.createObjectURL(
    new Blob([source], { type: PROCESSOR_MIME_TYPE } as never),
  );
};

export const createDefaultPitchShifter = (): PlaybackPitchShifter | null => {
  const scope = getWebScope();
  const AudioContextConstructor = scope.AudioContext;

  if (
    !AudioContextConstructor ||
    !canShapePitchOnPlatform({
      hasAudioWorklet: scope.AudioWorkletNode !== undefined,
      platformOs: 'web',
    })
  ) {
    return null;
  }

  return createWebPitchShifter({
    createAudioContext: () => new AudioContextConstructor(),
    createPitchNode: (context) =>
      new SoundTouchNode({ context: context as never }) as never,
    getMediaElement: () => scope.window?.rntp?.getMediaElement?.() ?? null,
    registerProcessor: async (context) => {
      const moduleUrl = await loadProcessorModuleUrl();

      try {
        await SoundTouchNode.register(context as never, moduleUrl);
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }
    },
  });
};
