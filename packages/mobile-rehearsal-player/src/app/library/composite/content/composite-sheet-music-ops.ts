import type {
  CompositeTrack,
  SavedDriveFile,
  SheetMusicAddition,
  SheetMusicChange,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type {
  SheetMusicItem,
  useSourceSheetMusic,
} from '../../sheet-music/hooks/use-source-sheet-music';
import type { CompositeStore } from '../store/composite-store';
import type { CompositeSheetMusicView } from './composite-sheet-music-model';

/** The writes the sheet music host makes, whichever record the list belongs to. */
export type SheetMusicOps = {
  add: (addition: SheetMusicAddition) => Promise<boolean>;
  update: (id: string, change: SheetMusicChange) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  replaceWithDrive: (id: string, file: SavedDriveFile) => Promise<boolean>;
};

const attempt = async (write: () => Promise<unknown>): Promise<boolean> => {
  try {
    await write();
    return true;
  } catch {
    return false;
  }
};

/**
 * A track's list is written through the library; a composite's combined list
 * writes each source where it is linked: the composite's own list through the
 * composite store, a stem's file on that stem's track (design Decision 11).
 */
export const resolveCompositeSheetMusicOps = (options: {
  composite: CompositeTrack | undefined;
  savedLibrarySources: readonly DriveLibrarySource[];
  sheetMusic: ReturnType<typeof useSourceSheetMusic>;
  store: Pick<
    CompositeStore,
    | 'addSheetMusic'
    | 'changeSheetMusic'
    | 'removeSheetMusic'
    | 'replaceSheetMusicWithDrive'
  >;
  trackItem: SheetMusicItem | null;
  view: CompositeSheetMusicView | null;
}): SheetMusicOps | null => {
  const { composite, savedLibrarySources, sheetMusic, store, view } = options;

  if (composite && view) {
    // Routes an edit of one source to the record that holds it.
    const route = async (
      id: string,
      onComposite: () => Promise<unknown>,
      onTrack: (track: SheetMusicItem) => Promise<boolean>,
    ): Promise<boolean> => {
      const target = view.resolveWriteTarget(id);

      if (target?.kind === 'composite') {
        return attempt(onComposite);
      }

      const track =
        target?.kind === 'track'
          ? savedLibrarySources.find(
              ({ id: trackId }) => trackId === target.trackId,
            )
          : undefined;

      return track ? onTrack(track) : false;
    };

    return {
      add: (addition) =>
        attempt(() => store.addSheetMusic(composite.id, addition)),
      update: (id, change) =>
        route(
          id,
          () => store.changeSheetMusic(composite.id, id, change),
          (track) => sheetMusic.updateSheetMusic(track, id, change),
        ),
      remove: (id) =>
        route(
          id,
          () => store.removeSheetMusic(composite.id, id),
          (track) => sheetMusic.removeSheetMusic(track, id),
        ),
      replaceWithDrive: (id, file) =>
        route(
          id,
          () => store.replaceSheetMusicWithDrive(composite.id, id, file),
          (track) => sheetMusic.replaceSheetMusicWithDrive(track, id, file),
        ),
    };
  }

  const { trackItem } = options;

  if (!trackItem) {
    return null;
  }

  return {
    add: (addition) => sheetMusic.addSheetMusic(trackItem, addition),
    update: (id, change) => sheetMusic.updateSheetMusic(trackItem, id, change),
    remove: (id) => sheetMusic.removeSheetMusic(trackItem, id),
    replaceWithDrive: (id, file) =>
      sheetMusic.replaceSheetMusicWithDrive(trackItem, id, file),
  };
};
