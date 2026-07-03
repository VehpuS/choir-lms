import {
  type NamedLoop,
  type PlayableItem,
  type Playlist,
} from '@org/audio-library-models';

import type {
  DriveLibrarySource,
  DriveLibraryStatusCopy,
} from '../../drive/utils/drive-library-view-model';
import type { SavedLoopIssue } from '../../loops/utils/saved-loop-view-model';
import type {
  SavedTrackPlaybackIssue,
  SavedTrackPlaybackState,
} from '../../playback/utils/saved-track-playback-view-model';
import type { PlaylistPlaybackSession } from '../../playlists/utils/saved-playlist-playback-view-model';
import type {
  PlaylistDraftIssue,
  SavedPlaylistIssue,
} from '../../playlists/utils/saved-playlist-view-model';
import type { SavedRehearsalLibraryIssue } from '../../saved-rehearsal-library/use-saved-rehearsal-library';

export type SavedRehearsalLibrarySectionProps = {
  activePlayableItem: PlayableItem | null;
  activePlaylistSession: PlaylistPlaybackSession | null;
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  deletePlaylist: (playlist: Playlist) => Promise<boolean>;
  getCurrentScrollOffsetY: () => number;
  isPlaybackPreparing: boolean;
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
  savedLibraryIssue: SavedRehearsalLibraryIssue | null;
  savedLibrarySources: DriveLibrarySource[];
  savedLibraryStatusCopy: DriveLibraryStatusCopy;
  savedLoopIssue: SavedLoopIssue | null;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedTrackPlaybackStatusCopy: DriveLibraryStatusCopy | null;
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  saveSource: (source: DriveLibrarySource) => Promise<boolean>;
  selectedTrack: PlayableItem | null;
  setIsPlaylistReorderDragActive: (isActive: boolean) => void;
  setPlaylistReorderDragMoveY: (moveY: number) => void;
  setSelectedLoopSourceId: (sourceId: string | null) => void;
  syncActivePlaylistContext: (options: {
    loops: NamedLoop[];
    playlists: Playlist[];
    sources: DriveLibrarySource[];
  }) => void;
  toggleActivePlayback: () => Promise<void>;
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
