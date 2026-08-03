import type {
  NamedLoop,
  Playlist,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { createLoopPlayableItem } from '@org/audio-library-models';

export type LibraryFilesBreadcrumb = {
  folderId: string;
  label: string;
};

export type LibraryFilesFolderRow = {
  childCount: number;
  folder: RehearsalLibraryFolderNode;
  kind: 'folder';
  label: string;
  supportingLabel: string;
};

export type LibraryFilesTrackRow = {
  fileLink: RehearsalLibraryFileLinkNode;
  isPlayable: boolean;
  kind: 'track';
  label: string;
  message?: string;
  source: DriveLibrarySource;
  supportingLabel: string;
};

export type LibraryFilesLoopRow = {
  fileLink: RehearsalLibraryFileLinkNode;
  kind: 'loop';
  label: string;
  loop: NamedLoop;
  message?: string;
  playableItem: ReturnType<typeof createLoopPlayableItem> | null;
  source: DriveLibrarySource | null;
  supportingLabel: string;
};

export type LibraryFilesPlaylistRow = {
  fileLink: RehearsalLibraryFileLinkNode;
  kind: 'playlist';
  label: string;
  playlist: Playlist;
  supportingLabel: string;
};

export type LibraryFilesRow =
  | LibraryFilesFolderRow
  | LibraryFilesTrackRow
  | LibraryFilesLoopRow
  | LibraryFilesPlaylistRow;

export type LibraryFilesExplorerState = {
  breadcrumbs: LibraryFilesBreadcrumb[];
  currentFolder: RehearsalLibraryFolderNode;
  rows: LibraryFilesRow[];
};

export type LibraryFilesFolderChildCounts = {
  folderCount: number;
  loopCount: number;
  playlistCount: number;
  totalCount: number;
  trackCount: number;
  unknownCount: number;
};