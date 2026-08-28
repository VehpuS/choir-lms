import {
  type NamedLoop,
  type PlayableItem,
  type Playlist,
} from '@org/audio-library-models';

import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type {
  DriveLibrarySource,
  DriveLibraryStatusCopy,
} from '../../drive/utils/drive-library-view-model';
import type { SavedLoopIssue } from '../../loops/utils/saved-loop-view-model';
import type {
  SavedTrackPlaybackIssue,
  SavedTrackPlaybackState,
} from '../../playback/utils/saved-track-playback-view-model';
import type {
  PlaylistDetailHeaderPlaybackAction,
  PlaylistPlaybackSession,
} from '../../playlists/utils/saved-playlist-playback-view-model';
import type {
  PlaylistDraftIssue,
  SavedPlaylistIssue,
} from '../../playlists/utils/saved-playlist-view-model';
import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type { SavedRehearsalLibraryIssue } from '../../saved-rehearsal-library/use-saved-rehearsal-library';
import type { TagDetailHeaderSearchActions } from '../../tags/hooks/use-tag-detail-header-search-actions';
import type { LibraryFilesSuccessFeedback } from './library-files-success-feedback';
import type { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';
import type { useSavedRehearsalLibrarySearchPanel } from './use-saved-rehearsal-library-search-panel';

export type LibraryBrowseCreateDockMode = 'files' | 'playlists' | null;

export type SavedRehearsalLibrarySectionProps = {
  activePlayableItem: PlayableItem | null;
  activePlaylistSession: PlaylistPlaybackSession | null;
  authorization?: DriveSessionMenuController;
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  closeTagDetailRequestId?: number;
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  deletePlaylist: (playlist: Playlist) => Promise<boolean>;
  getCurrentScrollOffsetY: () => number;
  isPlaybackPreparing: boolean;
  isPlaylistCreateDialogVisible?: boolean;
  isPlaylistsLoading: boolean;
  isSavedLibraryLoading: boolean;
  isSavedLoopsLoading: boolean;
  openLoopBuilderForSource: (source: DriveLibrarySource) => void;
  pendingLoopBuilderSourceId: string | null;
  pendingLoopId: string | null;
  pendingPlaylistId: string | null;
  pendingSourceId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  playlistIssue: SavedPlaylistIssue | null;
  queuePlayableItemNext: (playableItem: PlayableItem) => void;
  queuePlayableItemUpNext: (playableItem: PlayableItem) => void;
  removeLoop: (loop: NamedLoop) => void;
  removeSource: (source: DriveLibrarySource) => void;
  requestedTag?: string | null;
  requestedTagRequestId?: number;
  libraryFiles: UseLibraryFilesResult;
  libraryFilesSuccessFeedback: LibraryFilesSuccessFeedback | null;
  onBlurLibraryFilesSuccessFeedback: () => void;
  onDismissLibraryFilesSuccessFeedback: () => void;
  onFocusLibraryFilesSuccessFeedback: () => void;
  onBrowseCreateDockChange?: (mode: LibraryBrowseCreateDockMode) => void;
  onDetailPlaybackChange?: (
    action: PlaylistDetailHeaderPlaybackAction | null,
  ) => void;
  onDetailSearchActionsChange?: (
    actions: TagDetailHeaderSearchActions | null,
  ) => void;
  onOpenLibraryFilesSuccessFeedbackFolder: (folderId: string) => void;
  onPlaylistSelectionHandlerChange?: (
    handler: ((playlistId: string) => void) | null,
  ) => void;
  onShowLibraryFilesSuccessFeedback: (
    feedback: LibraryFilesSuccessFeedback,
  ) => void;
  savedLibraryIssue: SavedRehearsalLibraryIssue | null;
  savedLibrarySources: DriveLibrarySource[];
  savedLibraryStatusCopy: DriveLibraryStatusCopy;
  savedLoopIssue: SavedLoopIssue | null;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedTrackPlaybackStatusCopy: DriveLibraryStatusCopy | null;
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  saveSource: (source: DriveLibrarySource) => Promise<boolean>;
  searchPanel?: ReturnType<typeof useSavedRehearsalLibrarySearchPanel>;
  searchState?: ReturnType<typeof useSavedRehearsalLibrarySearch>;
  selectedTrack: PlayableItem | null;
  selectedView?: SavedRehearsalLibraryView;
  setIsPlaylistReorderDragActive: (isActive: boolean) => void;
  setPlaylistReorderDragMoveY: (moveY: number) => void;
  setSelectedLoopSourceId: (sourceId: string | null) => void;
  setSelectedView?: (view: SavedRehearsalLibraryView) => void;
  syncActivePlaylistContext: (options: {
    loops: NamedLoop[];
    playlists: Playlist[];
    sources: DriveLibrarySource[];
  }) => void;
  toggleActivePlayback: () => Promise<void>;
  toggleItemQueuePlayback: (items: PlayableItem[]) => Promise<void>;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  togglePlaylistPlayback: (options: {
    loops: NamedLoop[];
    mode: 'ordered' | 'shuffle';
    playlist: Playlist;
    sources: DriveLibrarySource[];
    startEntryId?: string;
  }) => Promise<void>;
  toggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

export type PlaylistSelectionState = {
  cardRenamePlaylistId: string | null;
  cardRenamePlaylistName: string;
  isPlaylistDetailVisible: boolean;
  selectedCardRenameIssue: PlaylistDraftIssue | null;
  selectedPlaylist: Playlist | null;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (playlistId: string) => void;
};
