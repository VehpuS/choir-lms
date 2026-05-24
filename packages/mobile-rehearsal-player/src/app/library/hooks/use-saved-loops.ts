import { type NamedLoop } from '@org/rehearsal-domain';
import { AsyncStoragePracticeRepository } from '@org/rehearsal-playback';
import { useEffect, useState } from 'react';

import type { SavedLoopIssue } from '../utils/saved-loop-view-model';
import {
  LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
  verifySavedRehearsalLibraryStorage,
} from './use-saved-rehearsal-library';

type SavedLoopReader = Pick<AsyncStoragePracticeRepository, 'listLoops'>;

const INITIAL_LOAD_ATTEMPTS = 2;
const STORAGE_UNAVAILABLE_ISSUE: SavedLoopIssue = {
  kind: 'storage',
  title: 'Saved loop storage unavailable',
  message:
    'This build could not access the device storage needed for saved practice loops.',
};
const practiceRepository = new AsyncStoragePracticeRepository();

const createSaveIssue = (
  loop: Pick<NamedLoop, 'id' | 'name'>,
  error: unknown,
): SavedLoopIssue => {
  const detail = error instanceof Error ? error.message.trim() : '';
  const fallbackMessage = `The rehearsal library could not save the loop "${loop.name}".`;

  return {
    kind: 'save',
    loopId: loop.id,
    title: 'Could not save loop',
    message: detail ? `${fallbackMessage} ${detail}` : fallbackMessage,
  };
};

export const loadSavedLoops = async (
  repository: SavedLoopReader,
  ownerId: string,
) => {
  for (let attempt = 0; attempt < INITIAL_LOAD_ATTEMPTS; attempt += 1) {
    try {
      return await repository.listLoops(ownerId);
    } catch {
      if (attempt === INITIAL_LOAD_ATTEMPTS - 1) {
        return [] as NamedLoop[];
      }
    }
  }

  return [] as NamedLoop[];
};

export const useSavedLoops = () => {
  const [savedLoops, setSavedLoops] = useState<NamedLoop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [issue, setIssue] = useState<SavedLoopIssue | null>(null);
  const [pendingLoopId, setPendingLoopId] = useState<string | null>(null);

  useEffect(() => {
    let isDisposed = false;

    const loadLoops = async () => {
      const storageReady = await verifySavedRehearsalLibraryStorage();

      if (isDisposed) {
        return;
      }

      if (!storageReady) {
        setIssue(STORAGE_UNAVAILABLE_ISSUE);
        setIsLoading(false);
        return;
      }

      const nextLoops = await loadSavedLoops(
        practiceRepository,
        LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      );

      if (isDisposed) {
        return;
      }

      setSavedLoops(nextLoops);
      setIssue(null);
      setIsLoading(false);
    };

    void loadLoops();

    return () => {
      isDisposed = true;
    };
  }, []);

  return {
    canMutateLoops: issue?.kind !== 'storage',
    isLoading,
    issue,
    pendingLoopId,
    savedLoops,
    async saveLoop(loop: NamedLoop) {
      if (issue?.kind === 'storage') {
        return false;
      }

      setPendingLoopId(loop.id);
      setIssue(null);

      try {
        const nextLoops = await practiceRepository.saveLoop(loop);

        setSavedLoops(nextLoops);
        return true;
      } catch (error) {
        setIssue(createSaveIssue(loop, error));
        return false;
      } finally {
        setPendingLoopId((currentLoopId) => {
          return currentLoopId === loop.id ? null : currentLoopId;
        });
      }
    },
  };
};
