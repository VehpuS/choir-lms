import type { AudioStore } from './audio-store-types';

/**
 * Native keeps no persistent audio yet: its store is built in
 * native-playback-follow-ups task 1.10. Until then every read misses.
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
  async setPinned() {
    return undefined;
  },
  async touch() {
    return undefined;
  },
  async write() {
    return undefined;
  },
};
