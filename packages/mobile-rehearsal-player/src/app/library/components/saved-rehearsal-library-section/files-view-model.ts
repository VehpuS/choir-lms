import type { PlayableItem } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type { ExplorerBreadcrumbItem } from '../explorer/model';

type LibraryFilesControllerLike = Pick<
  UseLibraryFilesResult,
  'explorer' | 'goToFolder' | 'goToParentFolder' | 'openFolder'
>;

export type SavedRehearsalLibraryFilesViewModel = {
  breadcrumbs: ExplorerBreadcrumbItem[];
  canGoBack: boolean;
  currentFolderName: string;
  rows: Array<{
    active: boolean;
    disabled: boolean;
    key: string;
    kind: NonNullable<
      LibraryFilesControllerLike['explorer']
    >['rows'][number]['kind'];
    label: string;
    message?: string;
    onPress: () => void;
    supportingLabel: string;
  }>;
};

const isRowActive = (
  activePlayableItem: PlayableItem | null,
  row: NonNullable<LibraryFilesControllerLike['explorer']>['rows'][number],
) => {
  if (!activePlayableItem) {
    return false;
  }

  if (row.kind === 'track') {
    return (
      activePlayableItem.kind === 'track' &&
      activePlayableItem.sourceId === row.source.id
    );
  }

  if (row.kind === 'loop') {
    return (
      activePlayableItem.kind === 'loop' &&
      activePlayableItem.loopId === row.loop.id
    );
  }

  if (row.kind === 'playlist') {
    return activePlayableItem.playlistId === row.playlist.id;
  }

  return false;
};

export const buildSavedRehearsalLibraryFilesViewModel = (options: {
  activePlayableItem: PlayableItem | null;
  files: LibraryFilesControllerLike;
  onOpenPlaylist: (playlistId: string) => void;
  onTogglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  onToggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
}): SavedRehearsalLibraryFilesViewModel | null => {
  const explorer = options.files.explorer;

  if (!explorer) {
    return null;
  }

  return {
    breadcrumbs: explorer.breadcrumbs.map((breadcrumb, index) => {
      const isCurrent = index === explorer.breadcrumbs.length - 1;

      return {
        isCurrent,
        key: breadcrumb.folderId,
        label: breadcrumb.label,
        onPress: isCurrent
          ? undefined
          : () => {
              options.files.goToFolder(breadcrumb.folderId);
            },
      };
    }),
    canGoBack: Boolean(explorer.currentFolder.parentFolderId),
    currentFolderName: explorer.currentFolder.name,
    rows: explorer.rows.map((row) => {
      const disabled =
        (row.kind === 'track' && !row.isPlayable) ||
        (row.kind === 'loop' && row.playableItem === null);

      return {
        active: isRowActive(options.activePlayableItem, row),
        disabled,
        key: row.kind === 'folder' ? row.folder.id : row.fileLink.id,
        kind: row.kind,
        label: row.label,
        message: 'message' in row ? row.message : undefined,
        onPress: () => {
          if (row.kind === 'folder') {
            options.files.openFolder(row.folder.id);
            return;
          }

          if (row.kind === 'track') {
            void options.onToggleSourcePlayback(row.source);
            return;
          }

          if (row.kind === 'loop') {
            if (!row.playableItem) {
              return;
            }

            void options.onTogglePlayableItemPlayback(row.playableItem);
            return;
          }

          options.onOpenPlaylist(row.playlist.id);
        },
        supportingLabel: row.supportingLabel,
      };
    }),
  };
};
