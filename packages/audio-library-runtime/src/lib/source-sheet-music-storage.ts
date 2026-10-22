import {
  createSheetMusicSource,
  normalizeSheetMusicLabel,
  parseSourceSheetMusic,
  replaceSourceLocationWithDrive,
  type SavedDriveFile,
  type DriveAudioSource,
  type SheetMusicFormat,
  type SheetMusicLocation,
  type SheetMusicPartSelection,
  type SheetMusicSource,
} from '@org/audio-library-models';
import { omit } from 'es-toolkit/compat';

import { writeStoredCollection } from './practice-repository-storage';

type SheetMusicRepository = {
  listSources(ownerId: string): Promise<DriveAudioSource[]>;
};

export type SheetMusicAddition = {
  format: SheetMusicFormat;
  label: string;
  location: SheetMusicLocation;
  partSelection?: SheetMusicPartSelection;
};

/** `partSelection: null` returns a source to the default (vocal parts). */
export type SheetMusicChange = {
  label?: string;
  partSelection?: SheetMusicPartSelection | null;
};

const createSheetMusicId = () =>
  `sheet-music:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Applies a change to one track's `sheetMusic` list and nothing else. The
 * result is re-read through the storage parser, so the cap, label limits, and
 * URL rules hold for every write; an empty list removes the field, and an
 * unknown track id leaves the library untouched.
 */
const updateSourceSheetMusic = async (
  repository: SheetMusicRepository,
  ownerId: string,
  sourceId: string,
  change: (current: SheetMusicSource[]) => SheetMusicSource[],
): Promise<DriveAudioSource[]> => {
  const sources = await repository.listSources(ownerId);

  if (!sources.some((source) => source.id === sourceId)) {
    return sources;
  }

  const nextSources = sources.map((source) => {
    if (source.id !== sourceId) {
      return source;
    }

    const sheetMusic = parseSourceSheetMusic(change(source.sheetMusic ?? []));
    const sourceWithoutSheetMusic = omit(source, ['sheetMusic']);

    return sheetMusic
      ? { ...sourceWithoutSheetMusic, sheetMusic }
      : sourceWithoutSheetMusic;
  });

  await writeStoredCollection('sources', ownerId, nextSources);

  return nextSources;
};

/**
 * Appends a source. An invalid addition, or one past the per-track limit, is
 * ignored; the manager sheet disables adding at the limit.
 */
export const addSheetMusicSourceToRepository = (
  repository: SheetMusicRepository,
  ownerId: string,
  sourceId: string,
  addition: SheetMusicAddition,
) => {
  return updateSourceSheetMusic(repository, ownerId, sourceId, (current) => {
    const created = createSheetMusicSource({
      ...addition,
      id: createSheetMusicId(),
      addedAt: new Date().toISOString(),
    });

    return created ? [...current, created] : current;
  });
};

export const updateSheetMusicSourceInRepository = (
  repository: SheetMusicRepository,
  ownerId: string,
  sourceId: string,
  sheetMusicId: string,
  change: SheetMusicChange,
) => {
  return updateSourceSheetMusic(repository, ownerId, sourceId, (current) =>
    current.map((entry) => {
      if (entry.id !== sheetMusicId) {
        return entry;
      }

      // An unusable label keeps the old one rather than blanking the row.
      const label =
        change.label === undefined
          ? undefined
          : normalizeSheetMusicLabel(change.label);
      const withoutSelection = omit(entry, ['partSelection']);
      const partSelection =
        change.partSelection === undefined
          ? entry.partSelection
          : (change.partSelection ?? undefined);

      return {
        ...withoutSelection,
        label: label ?? entry.label,
        ...(partSelection ? { partSelection } : {}),
      };
    }),
  );
};

export const removeSheetMusicSourceFromRepository = (
  repository: SheetMusicRepository,
  ownerId: string,
  sourceId: string,
  sheetMusicId: string,
) => {
  return updateSourceSheetMusic(repository, ownerId, sourceId, (current) =>
    current.filter((entry) => entry.id !== sheetMusicId),
  );
};

/**
 * Points one source at the Drive copy of its file (a link the browser could
 * not read, saved to Drive). The source keeps its id, label, and part
 * selection; an unknown source id changes nothing, so a source removed while
 * the upload ran is not brought back.
 */
export const replaceSheetMusicLocationInRepository = (
  repository: SheetMusicRepository,
  ownerId: string,
  sourceId: string,
  sheetMusicId: string,
  file: SavedDriveFile,
) => {
  return updateSourceSheetMusic(repository, ownerId, sourceId, (current) =>
    replaceSourceLocationWithDrive(current, sheetMusicId, file),
  );
};
