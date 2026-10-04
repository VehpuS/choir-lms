import type { LibraryFilesRow } from './types';

/**
 * Keeps adjusted tracks and loops with their source (task 6.6): in a folder
 * listing, each one follows its source track's row, adjusted tracks first and
 * then adjusted loops, each in the order the sort gave them, and is marked so
 * the list can indent it. An adjusted entity whose source track is not in the
 * same listing (another folder, or filtered out) stays where the sort put it.
 * Search results are flat and skip this.
 */
export const groupAdjustedRows = (
  rows: LibraryFilesRow[],
): LibraryFilesRow[] => {
  const sourceTrackIds = new Set(
    rows.flatMap((row) => {
      return row.kind === 'track' && !row.source.adjustment
        ? [row.source.id]
        : [];
    }),
  );
  const adjustedTracksBySourceId = new Map<string, LibraryFilesRow[]>();
  const adjustedLoopsBySourceId = new Map<string, LibraryFilesRow[]>();
  const groupedRows = new Set<LibraryFilesRow>();

  const addChild = (
    childrenBySourceId: Map<string, LibraryFilesRow[]>,
    sourceId: string,
    row: LibraryFilesRow,
  ) => {
    childrenBySourceId.set(sourceId, [
      ...(childrenBySourceId.get(sourceId) ?? []),
      { ...row, groupedUnderSourceId: sourceId } as LibraryFilesRow,
    ]);
    groupedRows.add(row);
  };

  for (const row of rows) {
    if (row.kind === 'track' && row.source.adjustment) {
      const { sourceRef } = row.source.adjustment;

      if (sourceTrackIds.has(sourceRef)) {
        addChild(adjustedTracksBySourceId, sourceRef, row);
      }
    } else if (row.kind === 'loop' && row.loop.transform) {
      if (sourceTrackIds.has(row.loop.sourceId)) {
        addChild(adjustedLoopsBySourceId, row.loop.sourceId, row);
      }
    }
  }

  return rows.flatMap((row) => {
    if (groupedRows.has(row)) {
      return [];
    }

    if (row.kind !== 'track' || row.source.adjustment) {
      return [row];
    }

    return [
      row,
      ...(adjustedTracksBySourceId.get(row.source.id) ?? []),
      ...(adjustedLoopsBySourceId.get(row.source.id) ?? []),
    ];
  });
};
