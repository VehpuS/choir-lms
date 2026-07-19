import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';

const formatImpactCount = (count: number, noun: string) => {
  return count > 0 ? `${count} ${noun}${count === 1 ? '' : 's'}` : null;
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
