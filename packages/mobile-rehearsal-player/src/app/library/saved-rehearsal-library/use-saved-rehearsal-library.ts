import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import { useEffect, useState } from 'react';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import {
  LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
  verifyLocalLibraryStorage,
} from '../storage/local-library-storage';

type SavedRehearsalLibraryReader = Pick<
  AsyncStoragePracticeRepository,
  'listSources'
>;

export type SavedRehearsalLibraryIssue = {
  kind: 'remove' | 'save' | 'storage';
  message: string;
  sourceId?: string;
  title: string;
};

const INITIAL_LOAD_ATTEMPTS = 2;
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

export const resolveSavedSourceDurationUpdate = (
  savedSources: DriveLibrarySource[],
  sourceId: string,
  durationMs: number,
) => {
  for (const source of savedSources) {
    if (source.id !== sourceId || source.durationMs === durationMs) {
      continue;
    }

    return {
      ...source,
      durationMs,
    } satisfies DriveLibrarySource;
  }

  return null;
};

export const useSavedRehearsalLibrary = () => {
  const [savedSources, setSavedSources] = useState<DriveLibrarySource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [issue, setIssue] = useState<SavedRehearsalLibraryIssue | null>(null);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);

  useEffect(() => {
    let isDisposed = false;

    const loadSavedSources = async () => {
      const storageReady = await verifyLocalLibraryStorage();

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

  const persistSource = async (
    source: DriveLibrarySource,
    options?: {
      clearIssue?: boolean;
      trackPending?: boolean;
    },
  ) => {
    if (issue?.kind === 'storage') {
      return false;
    }

    if (options?.trackPending) {
      setPendingSourceId(source.id);
    }

    if (options?.clearIssue) {
      setIssue(null);
    }

    try {
      const nextSources = await practiceRepository.saveSource(
        LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
        source,
      );

      setSavedSources(nextSources);
      return true;
    } catch (error) {
      setIssue(createMutationIssue('save', source.id, source.name, error));
      return false;
    } finally {
      if (options?.trackPending) {
        setPendingSourceId((currentSourceId) => {
          return currentSourceId === source.id ? null : currentSourceId;
        });
      }
    }
  };

  return {
    canMutateLibrary: issue?.kind !== 'storage',
    issue,
    isLoading,
    pendingSourceId,
    async refreshSources() {
      const nextSources = await loadSavedRehearsalLibrarySources(
        practiceRepository,
        LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      );

      setSavedSources(nextSources);
      setIssue(null);
    },
    async removeSource(source: DriveLibrarySource) {
      if (issue?.kind === 'storage') {
        return false;
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
        return true;
      } catch (error) {
        setIssue(createMutationIssue('remove', sourceId, source.name, error));
        return false;
      } finally {
        setPendingSourceId((currentSourceId) => {
          return currentSourceId === sourceId ? null : currentSourceId;
        });
      }
    },
    savedSources,
    async saveResolvedSourceDuration(sourceId: string, durationMs: number) {
      const updatedSource = resolveSavedSourceDurationUpdate(
        savedSources,
        sourceId,
        durationMs,
      );

      if (!updatedSource) {
        return false;
      }

      return persistSource(updatedSource);
    },
    async saveSource(source: DriveLibrarySource) {
      return persistSource(source, {
        clearIssue: true,
        trackPending: true,
      });
    },
  };
};
