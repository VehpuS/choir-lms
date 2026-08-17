import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { useSavedTrackPlayback } from '../../library/playback/hooks/use-saved-track-playback';
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
  | 'togglePlayableItemPlayback'
  | 'togglePlaylistPlayback'
  | 'toggleSourcePlayback'
>;

export type LibraryScreenProps = {
  authorization: DriveSessionMenuController;
  libraryController: ReturnType<typeof useRehearsalLibraryController>;
  onRequestAddDestination: () => void;
  onSelectTag: (tag: string) => void;
  playback: SavedTrackPlaybackController;
};
