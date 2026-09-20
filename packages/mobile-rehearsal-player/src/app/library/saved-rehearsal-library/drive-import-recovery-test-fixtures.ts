import type { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import type {
  DriveAudioDiscoveryResult,
  DriveEnumeratedAudioSource,
} from '@org/google-drive';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import type { createAudio } from './drive-import-planner-test-fixtures.js';

export const OWNER_ID = 'drive-import-recovery-user';
export const CREATED_AT = '2026-09-14T12:00:00.000Z';

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const originalAsyncStorage = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};

export const installMockAsyncStorage = () => {
  const store = new Map<string, string>();
  mutableAsyncStorage.getItem = async (key) => store.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key) => {
    store.delete(key);
  };
  mutableAsyncStorage.setItem = async (key, value) => {
    store.set(key, value);
  };
};

export const restoreAsyncStorage = () => {
  mutableAsyncStorage.getItem = originalAsyncStorage.getItem;
  mutableAsyncStorage.removeItem = originalAsyncStorage.removeItem;
  mutableAsyncStorage.setItem = originalAsyncStorage.setItem;
};

export const createPlanState = async (
  repository: AsyncStoragePracticeRepository,
) => ({
  entityCollections: {
    loops: await repository.listLoops(OWNER_ID),
    playlists: await repository.listPlaylists(OWNER_ID),
    sources: await repository.listSources(OWNER_ID),
  },
  tree: await repository.listLibraryFileTree(OWNER_ID),
});

export const asDiscoveredAudio = (
  source: ReturnType<typeof createAudio>,
): DriveAudioDiscoveryResult => source as DriveAudioDiscoveryResult;

export const asEnumeratedAudio = (
  source: ReturnType<typeof createAudio>,
): DriveEnumeratedAudioSource => source as DriveEnumeratedAudioSource;
