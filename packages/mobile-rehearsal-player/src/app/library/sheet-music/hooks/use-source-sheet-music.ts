import {
  resolveLyricsOwner,
  type SavedDriveFile,
  type SheetMusicSource,
} from '@org/audio-library-models';
import { replaceSheetMusicLocationInRepository } from '@org/audio-library-runtime';
import { useCallback } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { LyricsItem } from '../../lyrics/hooks/use-source-lyrics';
import {
  enqueueLibraryWrite,
  practiceRepository,
} from '../../saved-rehearsal-library/use-saved-rehearsal-library';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';

/** A track, adjusted track, or loop: anything whose sheet music resolves to a track. */
export type SheetMusicItem = LyricsItem;

type Repository = typeof practiceRepository;
export type SheetMusicAddition = Parameters<
  Repository['addSheetMusicSource']
>[2];
export type SheetMusicChange = Parameters<
  Repository['updateSheetMusicSource']
>[3];

export type SourceSheetMusicResolution = {
  /** The saved track that owns the list, or null when it no longer exists. */
  owner: DriveLibrarySource | null;
  sheetMusic: readonly SheetMusicSource[];
};

const NO_SHEET_MUSIC: readonly SheetMusicSource[] = [];

export const resolveSourceSheetMusic = (
  item: SheetMusicItem,
  savedSources: readonly DriveLibrarySource[],
): SourceSheetMusicResolution => {
  const owner = resolveLyricsOwner(item, savedSources);

  return { owner, sheetMusic: owner?.sheetMusic ?? NO_SHEET_MUSIC };
};

type UseSourceSheetMusicOptions = {
  canMutateLibrary: boolean;
  refreshSources: () => Promise<void>;
  savedSources: readonly DriveLibrarySource[];
};

export const useSourceSheetMusic = ({
  canMutateLibrary,
  refreshSources,
  savedSources,
}: UseSourceSheetMusicOptions) => {
  const sheetMusicFor = useCallback(
    (item: SheetMusicItem) => resolveSourceSheetMusic(item, savedSources),
    [savedSources],
  );

  // Writes always land on the owning track, so a loop or adjusted track opens
  // and edits its parent's list (design Decisions 8 and 13).
  const writeSheetMusic = useCallback(
    async (
      item: SheetMusicItem,
      write: (ownerId: string) => Promise<unknown>,
    ): Promise<boolean> => {
      const { owner } = resolveSourceSheetMusic(item, savedSources);

      if (!canMutateLibrary || !owner) {
        return false;
      }

      try {
        await enqueueLibraryWrite(() => write(owner.id));
        await refreshSources();
        return true;
      } catch {
        return false;
      }
    },
    [canMutateLibrary, refreshSources, savedSources],
  );

  const addSheetMusic = useCallback(
    (item: SheetMusicItem, addition: SheetMusicAddition) =>
      writeSheetMusic(item, (ownerId) =>
        practiceRepository.addSheetMusicSource(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          ownerId,
          addition,
        ),
      ),
    [writeSheetMusic],
  );

  const updateSheetMusic = useCallback(
    (item: SheetMusicItem, sheetMusicId: string, change: SheetMusicChange) =>
      writeSheetMusic(item, (ownerId) =>
        practiceRepository.updateSheetMusicSource(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          ownerId,
          sheetMusicId,
          change,
        ),
      ),
    [writeSheetMusic],
  );

  const removeSheetMusic = useCallback(
    (item: SheetMusicItem, sheetMusicId: string) =>
      writeSheetMusic(item, (ownerId) =>
        practiceRepository.removeSheetMusicSource(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          ownerId,
          sheetMusicId,
        ),
      ),
    [writeSheetMusic],
  );

  // For a link saved to Drive: the source keeps its id, label, and part
  // selection and loads from the Drive copy. An id removed meanwhile is ignored.
  const replaceSheetMusicWithDrive = useCallback(
    (item: SheetMusicItem, sheetMusicId: string, file: SavedDriveFile) =>
      writeSheetMusic(item, (ownerId) =>
        replaceSheetMusicLocationInRepository(
          practiceRepository,
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          ownerId,
          sheetMusicId,
          file,
        ),
      ),
    [writeSheetMusic],
  );

  return {
    addSheetMusic,
    removeSheetMusic,
    replaceSheetMusicWithDrive,
    sheetMusicFor,
    updateSheetMusic,
  };
};
