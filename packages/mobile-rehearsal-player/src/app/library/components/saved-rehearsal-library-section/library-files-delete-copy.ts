import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';

const formatImpactCount = (count: number, noun: string, plural?: string) => {
  return count > 0
    ? `${count} ${count === 1 ? noun : (plural ?? `${noun}s`)}`
    : null;
};

const formatAffectedSectionTitle = (label: string, count: number) => {
  return count > 0 ? `${label} (${count})` : '';
};

export const formatFolderDeleteImpactMessage = (
  row: Extract<LibraryFilesRow, { kind: 'folder' }>,
  impact: NonNullable<
    ReturnType<UseLibraryFilesResult['getFolderDeleteImpact']>
  >,
) => {
  const counts = [
    formatImpactCount(impact.folderCount, 'subfolder'),
    formatImpactCount(impact.trackLinkCount, 'track link'),
    formatImpactCount(impact.loopLinkCount, 'loop link'),
    formatImpactCount(impact.playlistLinkCount, 'playlist link'),
  ].filter(Boolean);

  if (counts.length === 0) {
    return `"${row.folder.name}" is empty and will be deleted from Library Files.`;
  }

  const libraryRemovalCopy =
    impact.lastLinkCount > 0
      ? ` ${impact.lastLinkCount} saved item${impact.lastLinkCount === 1 ? '' : 's'} will also be removed from the library because no other folder links remain.`
      : '';

  return `Deleting "${row.folder.name}" will remove ${counts.join(', ')} from Library Files.${libraryRemovalCopy}`;
};

export const formatTrackRemoveFromLibraryImpactMessage = (
  row: Extract<LibraryFilesRow, { kind: 'track' }>,
  impact: ReturnType<UseLibraryFilesResult['getTrackRemoveFromLibraryImpact']>,
) => {
  const totalAffectedItems =
    impact.loopCount + impact.fileLinkCount + impact.playlistEntryCount;

  if (totalAffectedItems === 0) {
    return `"${row.source.name}" will be removed from your saved rehearsal library.`;
  }

  return `"${row.source.name}" will be removed from your saved rehearsal library. Review affected items before confirming.`;
};

export const getTrackRemoveFromLibraryAffectedSections = (
  impact: ReturnType<UseLibraryFilesResult['getTrackRemoveFromLibraryImpact']>,
) => {
  return [
    {
      items: impact.loopNames,
      title: formatAffectedSectionTitle('Saved loops', impact.loopCount),
    },
    {
      items: impact.fileLinkNames,
      title: formatAffectedSectionTitle('Folder links', impact.fileLinkCount),
    },
    {
      items: impact.playlistEntryTitles,
      title: formatAffectedSectionTitle(
        'Playlist entries',
        impact.playlistEntryCount,
      ),
    },
  ].filter((section) => section.items.length > 0 && section.title.length > 0);
};
