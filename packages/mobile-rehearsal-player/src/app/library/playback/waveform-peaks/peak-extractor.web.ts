import {
  computeWaveformPeaks,
  type WaveformPeaks,
} from '@org/audio-library-models';

/**
 * Decoding holds the whole file as 32-bit float PCM (about 350 KB per second
 * of stereo), so very large files keep the placeholder band instead of
 * risking the tab's memory. 16 MB is roughly 17 minutes of 128 kbps MP3.
 */
export const MAX_DECODE_BYTES = 16 * 1024 * 1024;

const FALLBACK_SAMPLE_RATE = 44_100;

// The app's TypeScript config carries no DOM library, so the slice of the Web
// Audio API used here is described structurally.
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

export const extractWaveformPeaks = async (
  audio: Blob,
): Promise<WaveformPeaks | null> => {
  const OfflineContext = getOfflineAudioContext();

  if (!OfflineContext || audio.size > MAX_DECODE_BYTES) {
    return null;
  }

  try {
    const context = new OfflineContext(1, 1, FALLBACK_SAMPLE_RATE);
    const decoded = await context.decodeAudioData(await audio.arrayBuffer());
    const channels = Array.from(
      { length: decoded.numberOfChannels },
      (_, index) => decoded.getChannelData(index),
    );

    return computeWaveformPeaks(channels, decoded.sampleRate);
  } catch {
    // An undecodable file keeps the placeholder band.
    return null;
  }
};
