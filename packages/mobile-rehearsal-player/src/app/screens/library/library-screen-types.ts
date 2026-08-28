import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { useSavedTrackPlayback } from '../../library/playback/hooks/use-saved-track-playback';
import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import type { useRehearsalLibraryController } from '../../library/saved-rehearsal-library/use-rehearsal-library-controller';

type SavedTrackPlaybackController = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlaylistSession'
  | 'activePlayableItem'
  | 'isPreparing'
  | 'issue'
  | 'playbackState'
  | 'progress'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
  | 'seekActivePlaybackToPosition'
  | 'syncActivePlaylistContext'
  | 'toggleActivePlayback'
  | 'toggleItemQueuePlayback'
  | 'togglePlayableItemPlayback'
  | 'togglePlaylistPlayback'
  | 'toggleSourcePlayback'
>;

export type LibraryScreenProps = {
  authorization: DriveSessionMenuController;
  closeTagDetailRequestId?: number;
  isActive: boolean;
  libraryController: ReturnType<typeof useRehearsalLibraryController>;
  onRequestAddDestination: () => void;
  playback: SavedTrackPlaybackController;
  requestedTag?: string | null;
  requestedTagRequestId?: number;
  requestedView?: SavedRehearsalLibraryView;
  requestedViewRequestId?: number;
};
