import type { DecodedTrack } from '@org/audio-mixing';

/** Native cannot render a mix yet (see `recordingCapabilities`); the web file does. */
export const decodeTrackAudio: (
  audio: Blob,
) => Promise<DecodedTrack> = async () => {
  throw new Error('Decoding a track is only available on the web build.');
};
