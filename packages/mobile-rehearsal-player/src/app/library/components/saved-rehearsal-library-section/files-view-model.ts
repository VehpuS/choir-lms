import type { PlayableItem } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  getLibraryFilesRowNodeKey,
  type LibraryFilesExplorerState,
} from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type { AppIconName } from '../../../components/app-icon/model';
import type { ExplorerBreadcrumbItem } from '../explorer/model';
import {
  formatFilesRowMeta,
  resolveFilesRowPlaybackPresentation,
  type FilesRowPlaybackRing,
  type FilesViewPlayback,
} from './files-row-playback-model';

type LibraryFilesControllerLike = Pick<
  UseLibraryFilesResult,
  'goToFolder' | 'goToParentFolder' | 'openFolder'
> & {
  explorer?: LibraryFilesExplorerState | null;
};

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
    addAction?: FilesPlaylistAddAction;
    disabled: boolean;
    isActive: boolean;
    isPlaying: boolean;
    isPreparingLoop: boolean;
    key: string;
    kind: LibraryFilesExplorerState['rows'][number]['kind'];
    label: string;
    leadingIconName: AppIconName;
    message?: string;
    metaLabel: string;
    onPress: () => void;
    /** Absent for folders and while playlist add mode shows `Add`. */
    playbackRing?: FilesRowPlaybackRing;
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

export const isRowPreparingLoop = (
  pendingLoopBuilderSourceId: string | null,
  row: LibraryFilesExplorerState['rows'][number],
) => {
  if (pendingLoopBuilderSourceId === null) {
    return false;
  }

  if (row.kind === 'track') {
    return row.source.id === pendingLoopBuilderSourceId;
  }

  if (row.kind === 'loop') {
    return row.source?.id === pendingLoopBuilderSourceId;
  }

  return false;
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

/**
 * The full trail with the current folder as the last, non-interactive
 * segment (screen 1b). At the Library root it would only repeat the folder
 * title above it, so it is empty there.
 */
export const buildFilesBreadcrumbs = (
  explorer: Pick<LibraryFilesExplorerState, 'breadcrumbs'>,
  files: Pick<LibraryFilesControllerLike, 'goToFolder'>,
): ExplorerBreadcrumbItem[] => {
  if (explorer.breadcrumbs.length <= 1) {
    return [];
  }

  const currentIndex = explorer.breadcrumbs.length - 1;

  return explorer.breadcrumbs.map((breadcrumb, index) => {
    const isCurrent = index === currentIndex;

    return {
      isCurrent,
      key: breadcrumb.folderId,
      label: breadcrumb.label,
      onPress: isCurrent
        ? undefined
        : () => {
            files.goToFolder(breadcrumb.folderId);
          },
    };
  });
};

export const buildSavedRehearsalLibraryFilesViewModel = (options: {
  activePlayableItem: PlayableItem | null;
  explorer?: LibraryFilesExplorerState;
  files: LibraryFilesControllerLike;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenRow?: (row: LibraryFilesExplorerState['rows'][number]) => void;
  onTogglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  onToggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
  pendingLoopBuilderSourceId: string | null;
  playback: FilesViewPlayback;
  playlistAddMode?: FilesPlaylistAddMode;
}): SavedRehearsalLibraryFilesViewModel => {
  const explorer = options.explorer ?? options.files.explorer;

  if (!explorer) {
    throw new Error('Library files explorer state is required.');
  }

  const openRow = (row: LibraryFilesExplorerState['rows'][number]) => {
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
  };

  return {
    breadcrumbs: buildFilesBreadcrumbs(explorer, options.files),
    canGoBack: Boolean(explorer.currentFolder.parentFolderId),
    currentFolderName: explorer.currentFolder.name,
    rows: explorer.rows.map((row) => {
      const disabled =
        (row.kind === 'track' && !row.isPlayable) ||
        (row.kind === 'loop' && row.playableItem === null);
      const addAction = buildFilesPlaylistAddAction(
        row,
        options.playlistAddMode,
      );
      const playback = resolveFilesRowPlaybackPresentation({
        activePlayableItem: options.activePlayableItem,
        isActive: isRowActive(options.activePlayableItem, row),
        onToggle: () => {
          openRow(row);
        },
        playback: options.playback,
        row,
      });

      return {
        addAction,
        disabled,
        isActive: playback.isActive,
        isPlaying: playback.isPlaying,
        isPreparingLoop: isRowPreparingLoop(
          options.pendingLoopBuilderSourceId,
          row,
        ),
        key: getLibraryFilesRowNodeKey(row),
        kind: row.kind,
        label: row.label,
        leadingIconName: playback.leadingIconName,
        message: 'message' in row ? row.message : undefined,
        metaLabel: formatFilesRowMeta({
          isPlaying: playback.isPlaying,
          supportingLabel: row.supportingLabel,
        }),
        onPress: () => {
          openRow(row);
        },
        playbackRing: addAction ? undefined : playback.playbackRing,
      };
    }),
  };
};
