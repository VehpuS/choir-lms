import type { PlacementMode } from '@org/audio-library-runtime';
import type { RehearsalLibraryFolderNode } from '@org/audio-library-models';

import type { OptionsMenuAction } from '../options-menu-sheet/model';

type DestinationFolder = { folder: RehearsalLibraryFolderNode };

// Whether a folder is one of the selected folders or inside one: a move there
// would put a folder inside itself, so the picker disables it up front. The
// plan reports the same case for anything that still gets through.
const isInsideAny = (
  folderId: string,
  selectedFolderIds: ReadonlySet<string>,
  foldersById: ReadonlyMap<string, RehearsalLibraryFolderNode>,
) => {
  const visited = new Set<string>();
  let current = foldersById.get(folderId);

  while (current && !visited.has(current.id)) {
    if (selectedFolderIds.has(current.id)) {
      return true;
    }

    visited.add(current.id);
    current = current.parentFolderId
      ? foldersById.get(current.parentFolderId)
      : undefined;
  }

  return false;
};

/**
 * The folder picker for a bulk copy or move: `Copy here` / `Move here` for the
 * folder being browsed, a way back to its parent, and its subfolders to open.
 */
export const buildBulkDestinationPicker = (options: {
  currentFilesFolderId: string | null;
  destinationFolders: readonly DestinationFolder[];
  isMutating: boolean;
  mode: PlacementMode;
  onOpenFolder: (folderId: string) => void;
  onSelectFolder: (folderId: string) => void;
  pickerFolderId: string | null;
  selectedFolderIds: ReadonlySet<string>;
}): { actions: OptionsMenuAction[]; title: string } => {
  const foldersById = new Map(
    options.destinationFolders.map(({ folder }) => [folder.id, folder]),
  );
  const current =
    (options.pickerFolderId
      ? foldersById.get(options.pickerFolderId)
      : undefined) ?? options.destinationFolders[0]?.folder;
  const verb = options.mode === 'copy' ? 'Copy' : 'Move';

  if (!current) {
    return { actions: [], title: 'Choose folder' };
  }

  const isBlocked = (folderId: string) =>
    options.mode === 'move' &&
    isInsideAny(folderId, options.selectedFolderIds, foldersById);
  const parent = current.parentFolderId
    ? foldersById.get(current.parentFolderId)
    : undefined;
  const currentContext =
    current.id === options.currentFilesFolderId ? ' (current folder)' : '';

  return {
    actions: [
      {
        disabled: options.isMutating || isBlocked(current.id),
        id: `${current.id}:select-destination`,
        label: `${verb} here${currentContext}`,
        onPress: () => {
          options.onSelectFolder(current.id);
        },
        tone: 'primary',
      },
      ...(parent
        ? [
            {
              disabled: options.isMutating,
              id: `${parent.id}:open-parent-destination`,
              label: `Back to ${parent.name}`,
              onPress: () => {
                options.onOpenFolder(parent.id);
              },
              tone: 'secondary' as const,
            },
          ]
        : []),
      ...options.destinationFolders
        .filter(({ folder }) => folder.parentFolderId === current.id)
        .map(({ folder }) => ({
          disabled: options.isMutating || isBlocked(folder.id),
          id: `${folder.id}:open-destination`,
          label: folder.name,
          onPress: () => {
            options.onOpenFolder(folder.id);
          },
          tone: 'secondary' as const,
        })),
    ],
    title: `${verb} to ${current.name}`,
  };
};
