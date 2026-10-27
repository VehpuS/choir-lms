import { PcmSourceError, type PcmSource } from './pcm-source-types';

/**
 * Native has no microphone capture yet (design Decision 10; tracked in
 * `native-playback-follow-ups`). `pitchCapabilities().canListen` is false
 * here, so nothing asks for this source; if something does, it fails closed
 * and never touches the microphone.
 */
const nativePcmSource: PcmSource = {
  queryPermission: () => Promise.resolve('unknown'),
  subscribe: () => Promise.reject(new PcmSourceError('unavailable')),
};

export const getPcmSource = (): PcmSource => nativePcmSource;
