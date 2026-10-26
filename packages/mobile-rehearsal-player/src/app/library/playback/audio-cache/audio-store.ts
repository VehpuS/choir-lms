import type { AudioStore } from './audio-store-types';

/**
 * Native keeps no persistent audio yet: where files live on iOS and Android
 * is decided by offline-audio-caching task 1.4. Until then every read misses.
 */
export const audioStore: AudioStore = {
  async clear() {
    return undefined;
  },
  async list() {
    return [];
  },
  async read() {
    return null;
  },
  async remove() {
    return undefined;
  },
  async touch() {
    return undefined;
  },
  async write() {
    return undefined;
  },
};
