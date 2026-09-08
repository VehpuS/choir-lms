import type {
  DriveAudioDiscoveryResult,
  DriveDiscoveryResult,
  DriveFolderDiscoveryResult,
} from '@org/google-drive';

export type DriveImportSelectionOverlapCounts = {
  coveredAudio: number;
  duplicateSelections: number;
  nestedFolders: number;
  total: number;
};

export type NormalizedDriveImportSelection = {
  audio: DriveAudioDiscoveryResult[];
  folders: DriveFolderDiscoveryResult[];
  overlapCounts: DriveImportSelectionOverlapCounts;
};

const hasSelectedAncestor = (
  result: DriveDiscoveryResult,
  selectedFolderIds: ReadonlySet<string>,
) => {
  return (
    result.path?.some((segment) => selectedFolderIds.has(segment.id)) ?? false
  );
};

export const normalizeDriveImportSelection = (
  selection: readonly DriveDiscoveryResult[],
): NormalizedDriveImportSelection => {
  const uniqueSelection: DriveDiscoveryResult[] = [];
  const selectedIds = new Set<string>();
  let duplicateSelections = 0;

  for (const result of selection) {
    if (selectedIds.has(result.id)) {
      duplicateSelections += 1;
      continue;
    }

    selectedIds.add(result.id);
    uniqueSelection.push(result);
  }

  const selectedFolderIds = new Set(
    uniqueSelection.flatMap((result) =>
      result.kind === 'folder' ? [result.id] : [],
    ),
  );
  const folders: DriveFolderDiscoveryResult[] = [];
  const audio: DriveAudioDiscoveryResult[] = [];
  let nestedFolders = 0;
  let coveredAudio = 0;

  for (const result of uniqueSelection) {
    if (hasSelectedAncestor(result, selectedFolderIds)) {
      if (result.kind === 'folder') {
        nestedFolders += 1;
      } else {
        coveredAudio += 1;
      }
      continue;
    }

    if (result.kind === 'folder') {
      folders.push(result);
    } else {
      audio.push(result);
    }
  }

  return {
    audio,
    folders,
    overlapCounts: {
      coveredAudio,
      duplicateSelections,
      nestedFolders,
      total: coveredAudio + duplicateSelections + nestedFolders,
    },
  };
};
