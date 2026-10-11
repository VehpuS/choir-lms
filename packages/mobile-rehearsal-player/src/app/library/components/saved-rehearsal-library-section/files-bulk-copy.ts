import type {
  PlacementMode,
  PlacementPlanEntry,
} from '@org/audio-library-runtime';

import type {
  BulkDeleteFromFolderPlan,
  BulkRemoveFromLibraryPlan,
} from '../../saved-rehearsal-library/files-bulk-node-plans';
import type { BulkRemoveFromLibraryImpact } from '../../saved-rehearsal-library/library-files-bulk-operations';
import type { BulkAcknowledgment } from '../../selection/bulk-playback-run';
import type { LibraryFilesConfirmationDialogContent } from './library-files-confirmation-dialog';

// The words for the Files bulk actions that act on the selected nodes
// (design Decision 10): one aggregated confirmation per destructive action,
// one conflict list per copy or move, one acknowledgment on completion.

const plural = (count: number, noun: string, pluralNoun = `${noun}s`) =>
  `${count} ${count === 1 ? noun : pluralNoun}`;

const joinParts = (parts: readonly (string | null)[]) =>
  parts.filter((part): part is string => part !== null).join(', ');

const countOrNull = (count: number, noun: string, pluralNoun?: string) =>
  count > 0 ? plural(count, noun, pluralNoun) : null;

export const getBulkDeleteFromFolderConfirmation = (
  plan: BulkDeleteFromFolderPlan,
): LibraryFilesConfirmationDialogContent => {
  const removed = joinParts([
    countOrNull(plan.folderCount, 'folder'),
    countOrNull(plan.linkCount, 'link'),
  ]);
  const libraryRemoval =
    plan.lastLinkCount > 0
      ? ` ${plural(plan.lastLinkCount, 'saved item')} will also be removed from the library because no other folder links remain.`
      : '';

  return {
    confirmLabel: 'Delete from folder',
    message: `This deletes ${removed || 'nothing'} from Library Files.${libraryRemoval}`,
    title: 'Delete from folder?',
  };
};

const formatAffectedSectionTitle = (label: string, count: number) =>
  `${label} (${count})`;

export const getBulkRemoveFromLibraryConfirmation = (options: {
  impact: BulkRemoveFromLibraryImpact;
  names: { loops: string[]; playlists: string[]; tracks: string[] };
  plan: BulkRemoveFromLibraryPlan;
}): LibraryFilesConfirmationDialogContent => {
  const { impact, names, plan } = options;
  const removed = joinParts([
    countOrNull(plan.sourceIds.length, 'track'),
    countOrNull(plan.loopIds.length, 'loop'),
    countOrNull(plan.playlistIds.length, 'playlist'),
  ]);
  const leftOut =
    plan.excludedFolderCount > 0
      ? ` ${plural(plan.excludedFolderCount, 'selected folder')} will be left out; use Delete from folder to remove a folder.`
      : '';
  const sections = [
    { items: names.tracks, label: 'Tracks' },
    { items: names.loops, label: 'Loops' },
    { items: names.playlists, label: 'Playlists' },
    { items: impact.adjustedTrackNames, label: 'Adjusted tracks' },
    { items: impact.loopNames, label: 'Saved loops' },
    { items: impact.fileLinkNames, label: 'Folder links' },
    { items: impact.playlistEntryTitles, label: 'Playlist entries' },
  ];

  return {
    affectedSections: sections
      .filter(({ items }) => items.length > 0)
      .map(({ items, label }) => ({
        items,
        title: formatAffectedSectionTitle(label, items.length),
      })),
    confirmLabel: 'Remove from library',
    message: `${removed || 'Nothing'} will be removed from your saved rehearsal library. Review affected items before confirming.${leftOut}`,
    title: 'Remove from library?',
  };
};

/** One short line per conflict or invalid target, for the conflict list. */
export const getPlacementEntryDescription = (
  entry: PlacementPlanEntry,
  mode: PlacementMode,
): string => {
  if (entry.status === 'invalid') {
    return entry.invalidReason === 'folder-into-itself'
      ? 'A folder cannot be moved into itself or one of its subfolders.'
      : 'Folders cannot be copied.';
  }

  return `A ${mode === 'copy' ? 'copy' : 'move'} would clash with an item already named ${entry.name}.`;
};

export const getBulkPlacementAcknowledgment = (options: {
  destinationName: string;
  mode: PlacementMode;
  placedCount: number;
  skippedCount: number;
}): BulkAcknowledgment => {
  const skipped =
    options.skippedCount > 0
      ? ` ${plural(options.skippedCount, 'item')} left out.`
      : '';

  return {
    message: `${plural(options.placedCount, 'item')} ${options.mode === 'copy' ? 'copied to' : 'moved to'} ${options.destinationName}.${skipped}`,
    title: options.mode === 'copy' ? 'Copied to folder' : 'Moved to folder',
  };
};

export const getBulkDeleteAcknowledgment = (
  plan: BulkDeleteFromFolderPlan,
): BulkAcknowledgment => ({
  message: `${joinParts([
    countOrNull(plan.selectedFolderCount, 'folder'),
    countOrNull(plan.selectedLinkCount, 'link'),
  ])} deleted from Library Files.`,
  title: 'Deleted from folder',
});

export const getBulkRemoveAcknowledgment = (
  plan: BulkRemoveFromLibraryPlan,
): BulkAcknowledgment => ({
  message: `${joinParts([
    countOrNull(plan.sourceIds.length, 'track'),
    countOrNull(plan.loopIds.length, 'loop'),
    countOrNull(plan.playlistIds.length, 'playlist'),
  ])} removed from your library.`,
  title: 'Removed from library',
});
