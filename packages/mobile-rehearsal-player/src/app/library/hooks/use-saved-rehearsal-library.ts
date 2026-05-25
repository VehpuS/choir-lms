import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { DriveLibrarySource } from '../utils/drive-library-view-model';

type SavedRehearsalLibraryReader = Pick<
  AsyncStoragePracticeRepository,
  'listSources'
>;

type SavedRehearsalLibraryStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

export type SavedRehearsalLibraryIssue = {
  kind: 'remove' | 'save' | 'storage';
  message: string;
  sourceId?: string;
  title: string;
};

const INITIAL_LOAD_ATTEMPTS = 2;
export const LOCAL_REHEARSAL_LIBRARY_OWNER_ID = 'local-device-user';
const SAVED_LIBRARY_STORAGE_PROBE_KEY = 'choirlms:practice:probe';
const STORAGE_UNAVAILABLE_ISSUE: SavedRehearsalLibraryIssue = {
  kind: 'storage',
  title: 'Saved rehearsal storage unavailable',
  message:
    'This build could not access the device storage needed for the saved rehearsal library.',
};
const practiceRepository = new AsyncStoragePracticeRepository();

const createMutationIssue = (
  kind: 'remove' | 'save',
  sourceId: string,
  sourceName: string,
  error: unknown,
): SavedRehearsalLibraryIssue => {
  const fallbackMessage =
    kind === 'save'
      ? `The saved rehearsal library could not save "${sourceName}".`
      : `The saved rehearsal library could not remove "${sourceName}".`;
  const detail = error instanceof Error ? error.message.trim() : '';

  return {
    kind,
    title: kind === 'save' ? 'Could not save track' : 'Could not remove track',
    message: detail ? `${fallbackMessage} ${detail}` : fallbackMessage,
    sourceId,
  };
};

export const verifySavedRehearsalLibraryStorage = async (
  storage: SavedRehearsalLibraryStorage = AsyncStorage,
) => {
  try {
    await storage.setItem(SAVED_LIBRARY_STORAGE_PROBE_KEY, '[]');
    const storedValue = await storage.getItem(SAVED_LIBRARY_STORAGE_PROBE_KEY);

    await storage.removeItem(SAVED_LIBRARY_STORAGE_PROBE_KEY);

    return storedValue === '[]';
  } catch {
    try {
      await storage.removeItem(SAVED_LIBRARY_STORAGE_PROBE_KEY);
    } catch {
      // Ignore cleanup failures; the probe already established that storage is unusable.
    }

    return false;
  }
};

export const loadSavedRehearsalLibrarySources = async (
  repository: SavedRehearsalLibraryReader,
  ownerId: string,
) => {
  for (let attempt = 0; attempt < INITIAL_LOAD_ATTEMPTS; attempt += 1) {
    try {
      return await repository.listSources(ownerId);
    } catch {
      if (attempt === INITIAL_LOAD_ATTEMPTS - 1) {
        return [] as DriveLibrarySource[];
      }
    }
  }

  return [] as DriveLibrarySource[];
};

export const useSavedRehearsalLibrary = () => {
  const [savedSources, setSavedSources] = useState<DriveLibrarySource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [issue, setIssue] = useState<SavedRehearsalLibraryIssue | null>(null);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);

  useEffect(() => {
    let isDisposed = false;

    const loadSavedSources = async () => {
      const storageReady = await verifySavedRehearsalLibraryStorage();

      if (isDisposed) {
        return;
      }

      if (!storageReady) {
        setIssue(STORAGE_UNAVAILABLE_ISSUE);
        setIsLoading(false);
        return;
      }

      const nextSources = await loadSavedRehearsalLibrarySources(
        practiceRepository,
        LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      );

      if (isDisposed) {
        return;
      }

      setSavedSources(nextSources);
      setIssue(null);
      setIsLoading(false);
    };

    void loadSavedSources();

    return () => {
      isDisposed = true;
    };
  }, []);

  return {
    canMutateLibrary: issue?.kind !== 'storage',
    issue,
    isLoading,
    pendingSourceId,
    async removeSource(source: DriveLibrarySource) {
      if (issue?.kind === 'storage') {
        return;
      }

      const sourceId = source.id;

      setPendingSourceId(sourceId);
      setIssue(null);

      try {
        const nextSources = await practiceRepository.deleteSource(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          sourceId,
        );

        setSavedSources(nextSources);
      } catch (error) {
        setIssue(createMutationIssue('remove', sourceId, source.name, error));
      } finally {
        setPendingSourceId((currentSourceId) => {
          return currentSourceId === sourceId ? null : currentSourceId;
        });
      }
    },
    savedSources,
    async saveSource(source: DriveLibrarySource) {
      if (issue?.kind === 'storage') {
        return;
      }

      setPendingSourceId(source.id);
      setIssue(null);

      try {
        const nextSources = await practiceRepository.saveSource(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          source,
        );

        setSavedSources(nextSources);
      } catch (error) {
        setIssue(createMutationIssue('save', source.id, source.name, error));
      } finally {
        setPendingSourceId((currentSourceId) => {
          return currentSourceId === source.id ? null : currentSourceId;
        });
      }
    },
  };
};
