import { omit } from 'es-toolkit';

import type { CompositeTrack } from './composite-track.ts';
import {
  addToSheetMusicList,
  changeInSheetMusicList,
  removeFromSheetMusicList,
  type SheetMusicAddition,
  type SheetMusicChange,
} from './source-sheet-music-list.ts';
import type { SheetMusicSource } from './source-sheet-music.ts';
import {
  replaceSourceLocationWithDrive,
  type SavedDriveFile,
} from './source-sheet-music-drive-copy.ts';

/**
 * Sheet music added to the composite itself (design Decision 11). Files linked
 * by a stem are the stem's, never copied here; these edits touch only the list
 * on the composite, with the same cap and label rules as a track's list.
 */
export const addCompositeSheetMusic = (
  composite: CompositeTrack,
  addition: SheetMusicAddition,
  options?: { id?: string; addedAt?: string },
): CompositeTrack => {
  return withSheetMusic(
    composite,
    addToSheetMusicList(composite.sheetMusic ?? [], addition, options),
  );
};

export const changeCompositeSheetMusic = (
  composite: CompositeTrack,
  sheetMusicId: string,
  change: SheetMusicChange,
): CompositeTrack => {
  return withSheetMusic(
    composite,
    changeInSheetMusicList(composite.sheetMusic ?? [], sheetMusicId, change),
  );
};

export const removeCompositeSheetMusic = (
  composite: CompositeTrack,
  sheetMusicId: string,
): CompositeTrack => {
  return withSheetMusic(
    composite,
    removeFromSheetMusicList(composite.sheetMusic ?? [], sheetMusicId),
  );
};

/** A link saved to Drive keeps its id, label and part selection. */
export const replaceCompositeSheetMusicWithDrive = (
  composite: CompositeTrack,
  sheetMusicId: string,
  file: SavedDriveFile,
): CompositeTrack => {
  return withSheetMusic(
    composite,
    replaceSourceLocationWithDrive(
      composite.sheetMusic ?? [],
      sheetMusicId,
      file,
    ),
  );
};

// An empty list removes the field, as on a track.
const withSheetMusic = (
  composite: CompositeTrack,
  sheetMusic: SheetMusicSource[],
): CompositeTrack => {
  const rest = omit(composite, ['sheetMusic']);

  return sheetMusic.length > 0 ? { ...rest, sheetMusic } : rest;
};
