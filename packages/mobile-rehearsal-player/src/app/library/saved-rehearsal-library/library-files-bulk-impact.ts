import type { UseLibraryFilesOptions } from './library-files-operation-helpers';

export type BulkRemoveFromLibraryImpact = {
  adjustedTrackCount: number;
  adjustedTrackNames: string[];
  fileLinkCount: number;
  fileLinkNames: string[];
  loopCount: number;
  loopNames: string[];
  playlistEntryCount: number;
  playlistEntryTitles: string[];
};

type TrackRemoveImpactReader = (
  sourceId: string,
) => BulkRemoveFromLibraryImpact;

/**
 * Sums single-track removal impacts across a selection. An adjusted track
 * selected together with its source is already inside that source's impact,
 * so it is not counted twice; names that several tracks share are listed once.
 */
export const aggregateTrackRemoveImpacts = (options: {
  getImpact: TrackRemoveImpactReader;
  savedSources: UseLibraryFilesOptions['savedSources'];
  sourceIds: readonly string[];
}): BulkRemoveFromLibraryImpact => {
  const selectedIds = new Set(options.sourceIds);
  const independentIds = options.sourceIds.filter((sourceId) => {
    const sourceRef = options.savedSources.find(({ id }) => id === sourceId)
      ?.adjustment?.sourceRef;

    return !sourceRef || !selectedIds.has(sourceRef);
  });
  const impacts = independentIds.map(options.getImpact);
  const union = (pick: (impact: BulkRemoveFromLibraryImpact) => string[]) => [
    ...new Set(impacts.flatMap(pick)),
  ];
  const adjustedTrackNames = union((impact) => impact.adjustedTrackNames);
  const fileLinkNames = union((impact) => impact.fileLinkNames);
  const loopNames = union((impact) => impact.loopNames);
  const playlistEntryTitles = union((impact) => impact.playlistEntryTitles);

  return {
    adjustedTrackCount: adjustedTrackNames.length,
    adjustedTrackNames,
    fileLinkCount: fileLinkNames.length,
    fileLinkNames,
    loopCount: loopNames.length,
    loopNames,
    playlistEntryCount: playlistEntryTitles.length,
    playlistEntryTitles,
  };
};
