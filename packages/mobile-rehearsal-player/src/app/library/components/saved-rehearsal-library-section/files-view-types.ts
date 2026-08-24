import type {
  PlayableItem,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type {
  LibraryFilesSearchScope,
  LibraryFilesSortDirection,
  LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type {
  LibrarySearchEntityFilter,
  TagFilterMatchMode,
} from '../../search/utils/saved-library-search-view-model';
import type { FilesPlaylistAddMode } from './files-view-model';
import type { LibraryFilesSuccessFeedback } from './library-files-success-feedback';

export type SavedRehearsalLibraryFilesViewProps = {
  activePlayableItem: PlayableItem | null;
  authorization?: DriveSessionMenuController;
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  files: UseLibraryFilesResult;
  isLoopBuilderPreparing: boolean;
  isLoopMutating: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  pendingLoopBuilderSourceId: string | null;
  onOpenLoopBuilderForSource: (source: DriveLibrarySource) => void;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  onOpenFolderTagEditor: (folder: RehearsalLibraryFolderNode) => void;
  onOpenPlaylistAddItems: (playlistId: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  onPlaylistRenameVisibilityChange?: (isVisible: boolean) => void;
  onDismissSuccessFeedback: () => void;
  onOpenSourcePlaylistSelector: (sourceId: string) => void;
  onOpenSourceTagEditor: (source: DriveLibrarySource) => void;
  onOpenLoopTagEditor: (loopId: string) => void;
  onOpenSuccessFeedbackFolder: (folderId: string) => void;
  onShowSuccessFeedback: (feedback: LibraryFilesSuccessFeedback) => void;
  onQueuePlayableItemNext: (playableItem: PlayableItem) => void;
  onQueuePlayableItemUpNext: (playableItem: PlayableItem) => void;
  onRemoveSource: (source: DriveLibrarySource) => void;
  playlistAddMode?: FilesPlaylistAddMode;
  searchState: {
    activeSearchQuery: string | null;
    entityFilter: LibrarySearchEntityFilter;
    filesOpenedAtByNodeKey: Readonly<Record<string, string>>;
    filesSearchScope: LibraryFilesSearchScope;
    filesSortDirection: LibraryFilesSortDirection;
    filesSortMode: LibraryFilesSortMode;
    recordFilesEntryOpened: (nodeKey: string) => void;
    selectedTagFilters: string[];
    tagFilterMatchMode: TagFilterMatchMode;
  };
  successFeedback: LibraryFilesSuccessFeedback | null;
  onTogglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  onToggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
};
