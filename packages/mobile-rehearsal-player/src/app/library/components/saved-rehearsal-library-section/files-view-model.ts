import type { PlayableItem } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  getLibraryFilesRowNodeKey,
  type LibraryFilesExplorerState,
} from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type { ExplorerBreadcrumbItem } from '../explorer/model';

type LibraryFilesControllerLike = Pick<
  UseLibraryFilesResult,
  'goToFolder' | 'goToParentFolder' | 'openFolder'
>;

export type FilesPlaylistAddMode = {
  canMutatePlaylists: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  onAddLoop: (loopId: string) => void;
  onDone: () => void;
  onAddSource: (sourceId: string) => void;
  playlistName: string;
};

type FilesPlaylistAddAction = {
  accessibilityLabel: string;
  disabled: boolean;
  label: string;
  onPress: () => void;
};

const FILES_PLAYLIST_ADD_ACTION_LABEL = 'Add';
const FILES_PLAYLIST_ADD_ACTION_PENDING_LABEL = 'Adding…';

export type SavedRehearsalLibraryFilesViewModel = {
  breadcrumbs: ExplorerBreadcrumbItem[];
  canGoBack: boolean;
  currentFolderName: string;
  rows: Array<{
    active: boolean;
    addAction?: FilesPlaylistAddAction;
    disabled: boolean;
    key: string;
    kind: LibraryFilesExplorerState['rows'][number]['kind'];
    label: string;
    message?: string;
    onPress: () => void;
    supportingLabel: string;
  }>;
};

export const getFilesPlaylistAddModeCopy = (options: {
  currentFolderName: string;
  playlistName: string;
}) => {
  return {
    message:
      `Choose tracks or loops from ${options.currentFolderName}, then return to ` +
      `${options.playlistName} when the running order looks right.`,
    title: `Add items to ${options.playlistName}`,
  };
};

const buildFilesPlaylistAddAction = (
  row: LibraryFilesExplorerState['rows'][number],
  playlistAddMode?: FilesPlaylistAddMode,
): FilesPlaylistAddAction | undefined => {
  if (!playlistAddMode || (row.kind !== 'track' && row.kind !== 'loop')) {
    return undefined;
  }

  const disabled =
    !playlistAddMode.canMutatePlaylists ||
    playlistAddMode.isPlaylistMutating ||
    playlistAddMode.isSavedLibraryMutating;

  return {
    accessibilityLabel: `Add ${row.label} to ${playlistAddMode.playlistName}`,
    disabled,
    label: playlistAddMode.isPlaylistMutating
      ? FILES_PLAYLIST_ADD_ACTION_PENDING_LABEL
      : FILES_PLAYLIST_ADD_ACTION_LABEL,
    onPress: () => {
      if (row.kind === 'track') {
        playlistAddMode.onAddSource(row.source.id);
        return;
      }

      playlistAddMode.onAddLoop(row.loop.id);
    },
  };
};

const isRowActive = (
  activePlayableItem: PlayableItem | null,
  row: LibraryFilesExplorerState['rows'][number],
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
  explorer: LibraryFilesExplorerState;
  files: LibraryFilesControllerLike;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenRow?: (row: LibraryFilesExplorerState['rows'][number]) => void;
  onTogglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  onToggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
  playlistAddMode?: FilesPlaylistAddMode;
}): SavedRehearsalLibraryFilesViewModel => {
  const explorer = options.explorer;

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
        addAction: buildFilesPlaylistAddAction(row, options.playlistAddMode),
        disabled,
        key: getLibraryFilesRowNodeKey(row),
        kind: row.kind,
        label: row.label,
        message: 'message' in row ? row.message : undefined,
        onPress: () => {
          options.onOpenRow?.(row);

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
