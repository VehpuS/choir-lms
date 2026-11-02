import type { DecodedTrack } from '@org/audio-mixing';

const FALLBACK_SAMPLE_RATE = 44_100;

// The app's TypeScript config carries no DOM library, so the slice of the Web
// Audio API used here is described structurally (as in `peak-extractor.web`).
type DecodedAudio = {
  getChannelData: (channel: number) => Float32Array;
  numberOfChannels: number;
  sampleRate: number;
};

type OfflineAudioContextConstructor = new (
  channelCount: number,
  length: number,
  sampleRate: number,
) => { decodeAudioData: (audio: ArrayBuffer) => Promise<DecodedAudio> };

const getOfflineAudioContext = (): OfflineAudioContextConstructor | null => {
  const scope = globalThis as unknown as {
    OfflineAudioContext?: OfflineAudioContextConstructor;
    webkitOfflineAudioContext?: OfflineAudioContextConstructor;
  };

  return scope.OfflineAudioContext ?? scope.webkitOfflineAudioContext ?? null;
};

/**
 * Decodes the original track once per render (rehearsal-recording design
 * Decision 12). The whole file is held as float PCM while it renders; the
 * mixed output is what stays small, because it is written as Int16 a chunk at
 * a time.
 */
export const decodeTrackAudio = async (audio: Blob): Promise<DecodedTrack> => {
  const OfflineContext = getOfflineAudioContext();

  if (!OfflineContext) {
    throw new Error('This browser cannot decode audio offline.');
  }

  const context = new OfflineContext(1, 1, FALLBACK_SAMPLE_RATE);
  const decoded = await context.decodeAudioData(await audio.arrayBuffer());

  return {
    channels: Array.from({ length: decoded.numberOfChannels }, (_, index) =>
      decoded.getChannelData(index),
    ),
    sampleRate: decoded.sampleRate,
  };
};
