import type { PlayableItem } from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';

export type FileLinkLibraryFilesRow = Extract<
  LibraryFilesRow,
  { kind: 'loop' } | { kind: 'playlist' } | { kind: 'track' }
>;

export type ResolveFilesRowMenuActionsBaseOptions = {
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  canReconnectLibrarySource: boolean;
  isLoopBuilderPreparing: boolean;
  isLoopMutating: boolean;
  pendingLoopBuilderSourceId: string | null;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  onCreateFileLinkCopy: (row: FileLinkLibraryFilesRow) => void;
  onDeleteFileNode: (row: LibraryFilesRow) => void;
  onMoveFileNode: (row: LibraryFilesRow) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenLoopBuilder: (sourceId: string) => void;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  onOpenSourcePlaylistSelector: (sourceId: string) => void;
  onOpenSourceTagEditor: (sourceId: string) => void;
  onOpenLoopTagEditor: (loopId: string) => void;
  onOpenPlaylistAddItems: (playlistId: string) => void;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  onQueuePlayableItemNext: (playableItem: PlayableItem) => void;
  onQueuePlayableItemUpNext: (playableItem: PlayableItem) => void;
  onReconnectLibrarySource: (sourceId: string) => void;
  onRenameFileNode: (row: LibraryFilesRow) => void;
  onRemoveLibrarySource: (sourceId: string) => void;
};
