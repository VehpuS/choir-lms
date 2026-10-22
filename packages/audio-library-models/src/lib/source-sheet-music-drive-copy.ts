import {
  detectSheetMusicFormat,
  type SheetMusicSource,
} from './source-sheet-music.ts';

export type SavedDriveFile = { fileId: string; name: string };

/**
 * Points one sheet music source at a Drive copy of its file, for a link the
 * browser could not read. The source keeps its id, label, part selection, and
 * added time, so the track looks the same and only where the file comes from
 * changes. The format is read again from the saved file's name, since a link
 * with no extension was `link`. An unknown id (the source was removed while
 * the upload ran) changes nothing, so a removed source is not brought back.
 */
export const replaceSourceLocationWithDrive = (
  sources: readonly SheetMusicSource[],
  sourceId: string,
  file: SavedDriveFile,
): SheetMusicSource[] => {
  const detected = detectSheetMusicFormat({ name: file.name });

  return sources.map((source) =>
    source.id === sourceId
      ? {
          ...source,
          format: detected === 'refused' ? source.format : detected,
          location: { kind: 'drive', fileId: file.fileId, name: file.name },
        }
      : source,
  );
};
