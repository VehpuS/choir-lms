import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import type { DriveAudioSource } from '@org/audio-library-models';
import { omit } from 'es-toolkit/compat';
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
  kind: 'offline' | 'remove' | 'save' | 'storage';
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
export const practiceRepository = new AsyncStoragePracticeRepository();

// Saves, removals and learned durations all rewrite the same stored list, and
// callbacks held by playback or the loop builder can run long after the render
// that created them. They run one at a time, in the order they were requested,
// so a late write can no longer land on top of a removal.
let pendingLibraryWrite: Promise<unknown> = Promise.resolve();

export const enqueueLibraryWrite = <Result>(write: () => Promise<Result>) => {
  const result = pendingLibraryWrite.then(write, write);

  pendingLibraryWrite = result.catch(() => undefined);

  return result;
};

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

/** A `Keep offline` that did not finish; the track itself is unaffected. */
export const createOfflineIssue = (
  sourceId: string,
  sourceName: string,
  error: unknown,
): SavedRehearsalLibraryIssue => {
  const detail = error instanceof Error ? error.message.trim() : '';

  return {
    kind: 'offline',
    title: 'Could not keep offline',
    message: `Couldn't keep "${sourceName}" offline.${detail ? ` ${detail}` : ''}`,
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

export const prepareDriveSourceForPersistence = (
  source: DriveLibrarySource,
): DriveAudioSource => {
  const persistedSource = omit(source, ['locationLabel', 'path', 'rootKind']);
  const path = source.path;
  const parentFolder = path?.[path.length - 1];

  if (!source.rootKind || !path || !parentFolder) {
    return persistedSource;
  }

  return {
    ...persistedSource,
    sourceLocation: {
      parentFolderId: parentFolder.id,
      parentFolderName: parentFolder.name,
      rootKind: source.rootKind,
      path: path.map((segment) => ({ ...segment })),
    },
  };
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
      const nextSources = await enqueueLibraryWrite(() =>
        practiceRepository.saveSource(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          prepareDriveSourceForPersistence(source),
        ),
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
    clearOfflineIssue() {
      setIssue((current) => (current?.kind === 'offline' ? null : current));
    },
    issue,
    isLoading,
    pendingSourceId,
    reportOfflineIssue(source: DriveLibrarySource, error: unknown) {
      setIssue(createOfflineIssue(source.id, source.name, error));
    },
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
        const nextSources = await enqueueLibraryWrite(() =>
          practiceRepository.deleteSource(
            LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
            sourceId,
          ),
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
      if (issue?.kind === 'storage') {
        return false;
      }

      try {
        // Decided against what is stored when the write runs, not against this
        // render's `savedSources`: a callback holding an older render still
        // lists a source that has since been removed, and saving its snapshot
        // would bring the track back.
        const nextSources = await enqueueLibraryWrite(async () => {
          const storedSources = await practiceRepository.listSources(
            LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          );
          const updatedSource = resolveSavedSourceDurationUpdate(
            storedSources,
            sourceId,
            durationMs,
          );

          return updatedSource
            ? practiceRepository.saveSource(
                LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
                prepareDriveSourceForPersistence(updatedSource),
              )
            : null;
        });

        if (!nextSources) {
          return false;
        }

        setSavedSources(nextSources);
        return true;
      } catch (error) {
        setIssue(createMutationIssue('save', sourceId, sourceId, error));
        return false;
      }
    },
    async saveSource(source: DriveLibrarySource) {
      return persistSource(source, {
        clearIssue: true,
        trackPending: true,
      });
    },
  };
};
