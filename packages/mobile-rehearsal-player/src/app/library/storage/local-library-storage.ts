import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocalLibraryStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

export const LOCAL_REHEARSAL_LIBRARY_OWNER_ID = 'local-device-user';

const LOCAL_LIBRARY_STORAGE_PROBE_KEY = 'choirlms:practice:probe';

export const verifyLocalLibraryStorage = async (
  storage: LocalLibraryStorage = AsyncStorage,
) => {
  try {
    await storage.setItem(LOCAL_LIBRARY_STORAGE_PROBE_KEY, '[]');
    const storedValue = await storage.getItem(LOCAL_LIBRARY_STORAGE_PROBE_KEY);

    await storage.removeItem(LOCAL_LIBRARY_STORAGE_PROBE_KEY);

    return storedValue === '[]';
  } catch {
    try {
      await storage.removeItem(LOCAL_LIBRARY_STORAGE_PROBE_KEY);
    } catch {
      // Ignore cleanup failures; the probe already established that storage is unusable.
    }

    return false;
  }
};
