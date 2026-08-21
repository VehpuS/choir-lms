import { Pressable, StyleSheet } from 'react-native';

import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { SavedRehearsalLibraryHeader } from '../../library/components/saved-rehearsal-library-section/search-shell';
import type { PlaylistDetailHeaderPlaybackAction } from '../../library/playlists/utils/saved-playlist-playback-view-model';
import type { TagDetailHeaderSearchActions } from '../../library/tags/hooks/use-tag-detail-header-search-actions';
import type { LibraryHeaderSearchProps } from './library-header-search-props';

type LibraryScreenHeaderProps = {
  authorization: DriveSessionMenuController;
  detailSearchActions: TagDetailHeaderSearchActions | null;
  headerSearchProps: LibraryHeaderSearchProps;
  isSessionMenuVisible: boolean;
  onCloseSessionMenu: () => void;
  onToggleSessionMenu: () => void;
  playlistDetailPlayback: PlaylistDetailHeaderPlaybackAction | null;
};

export const LibraryScreenHeader = ({
  authorization,
  detailSearchActions,
  headerSearchProps,
  isSessionMenuVisible,
  onCloseSessionMenu,
  onToggleSessionMenu,
  playlistDetailPlayback,
}: LibraryScreenHeaderProps) => {
  return (
    <>
      {isSessionMenuVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={onCloseSessionMenu}
          style={styles.menuBackdrop}
        />
      ) : null}
      <SavedRehearsalLibraryHeader
        authorization={authorization}
        canShowFilterPopover={headerSearchProps.canShowFilterPopover}
        canShowSearch={headerSearchProps.canShowSearch}
        closeSearchAccessibilityLabel={
          detailSearchActions?.closeSearchAccessibilityLabel
        }
        handleFilterActionPress={headerSearchProps.handleFilterActionPress}
        handleSearchActionPress={headerSearchProps.handleSearchActionPress}
        hasActiveFilters={headerSearchProps.hasActiveFilters}
        headerPlaybackAction={playlistDetailPlayback}
        hideFiltersAccessibilityLabel={
          detailSearchActions?.hideFiltersAccessibilityLabel
        }
        isSessionMenuVisible={isSessionMenuVisible}
        onCloseSessionMenu={onCloseSessionMenu}
        onToggleSessionMenu={onToggleSessionMenu}
        searchAccessibilityLabel={detailSearchActions?.searchAccessibilityLabel}
        searchPanelVisibility={headerSearchProps.searchPanelVisibility}
        showFiltersAccessibilityLabel={
          detailSearchActions?.showFiltersAccessibilityLabel
        }
        style={styles.destinationHeader}
      />
    </>
  );
};

const styles = StyleSheet.create({
  destinationHeader: {
    marginTop: 12,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
