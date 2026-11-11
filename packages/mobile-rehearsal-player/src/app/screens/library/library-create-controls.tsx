import type { LibraryFilesSuccessFeedback } from '../../library/components/saved-rehearsal-library-section/library-files-success-feedback';
import { useIsBulkActionBarPinned } from '../../library/selection/use-pinned-bulk-action-bar';
import { useLayoutClass } from '../../routing/shell/layout-class';
import { LibraryFilesCreateControls } from './library-files-create-controls';
import { LibraryPlaylistCreateControls } from './library-playlist-create-controls';
import type { LibraryCreateDockMode } from './library-header-create-action';
import type { LibraryScreenProps } from './library-screen-types';

/**
 * Where the Library's `+` is: floating over the list in the compact layout, a
 * header action in the wide-short one (which has no height to spare), and
 * absent while a selection's bulk-action bar is pinned.
 */
export const useLibraryCreateDockPlacement = () => {
  const isBulkBarPinned = useIsBulkActionBarPinned();
  const isCompact = useLayoutClass() === 'compact';

  return {
    isFloating: isCompact && !isBulkBarPinned,
    isInHeader: !isCompact && !isBulkBarPinned,
  };
};

type LibraryCreateControlsProps = {
  dockMode: LibraryCreateDockMode;
  isFloating: boolean;
  libraryController: LibraryScreenProps['libraryController'];
  onFilesPlaylistCreateDialogVisibilityChange: (isVisible: boolean) => void;
  onPlaylistsCreateDialogVisibilityChange: (isVisible: boolean) => void;
  onRequestAddDestination: () => void;
  onSelectCreatedPlaylist: (playlistId: string) => void;
  onShowSuccessFeedback: (feedback: LibraryFilesSuccessFeedback) => void;
};

/**
 * The Files create menu and the Playlists create dialog, with the floating
 * `+` that opens each while it is the one in use. The menu and dialog stay
 * mounted either way, so the header `+` can ask for them too.
 */
export const LibraryCreateControls = ({
  dockMode,
  isFloating,
  libraryController,
  onFilesPlaylistCreateDialogVisibilityChange,
  onPlaylistsCreateDialogVisibilityChange,
  onRequestAddDestination,
  onSelectCreatedPlaylist,
  onShowSuccessFeedback,
}: LibraryCreateControlsProps) => (
  <>
    <LibraryFilesCreateControls
      createPlaylist={libraryController.playlists.createPlaylist}
      files={libraryController.savedLibrary.files}
      isVisible={isFloating && dockMode === 'files'}
      onPlaylistCreateDialogVisibilityChange={
        onFilesPlaylistCreateDialogVisibilityChange
      }
      onRequestAddDestination={onRequestAddDestination}
      onShowSuccessFeedback={onShowSuccessFeedback}
      playlistIssue={libraryController.playlists.issue}
    />
    <LibraryPlaylistCreateControls
      canMutatePlaylists={libraryController.playlists.canMutatePlaylists}
      createPlaylist={libraryController.playlists.createPlaylist}
      isVisible={isFloating && dockMode === 'playlists'}
      onPlaylistCreateDialogVisibilityChange={
        onPlaylistsCreateDialogVisibilityChange
      }
      onSelectPlaylist={onSelectCreatedPlaylist}
      playlistIssue={libraryController.playlists.issue}
    />
  </>
);
