import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { DriveSessionMenu } from '../../../auth/google-drive/components/drive-session-menu';
import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { CompactPlaybackAction } from '../../../components/compact-playback-action';
import { DestinationHeader } from '../../../components/destination-header';
import { getDestinationHeaderModel } from '../../../components/destination-header-model';
import type { PlaylistDetailHeaderPlaybackAction } from '../../playlists/utils/saved-playlist-playback-view-model';
import {
  SAVED_REHEARSAL_LIBRARY_VIEW_OPTIONS,
  type SavedRehearsalLibraryView,
} from '../../saved-rehearsal-library/detail-mode';
import {
  LibrarySearchControls,
  LibrarySearchControlsActions,
} from '../../search/components/library-search-controls';
import { InteractionChip } from '../interaction-chip';
import { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';

export type SearchPanelVisibility = {
  isFilterPopoverVisible: boolean;
  isSearchBarVisible: boolean;
};

type SavedRehearsalLibraryHeaderProps = {
  authorization?: DriveSessionMenuController;
  canShowSearch: boolean;
  closeSearchAccessibilityLabel?: string;
  handleFilterActionPress: () => void;
  handleSearchActionPress: () => void;
  hasActiveFilters: boolean;
  headerPlaybackAction?: PlaylistDetailHeaderPlaybackAction | null;
  hideFiltersAccessibilityLabel?: string;
  isSessionMenuVisible: boolean;
  onCloseSessionMenu: () => void;
  onToggleSessionMenu: () => void;
  searchAccessibilityLabel?: string;
  searchPanelVisibility: SearchPanelVisibility;
  showFiltersAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

type SavedRehearsalLibrarySearchShellProps = {
  currentFilesFolderName: string | null;
  handleFilterActionPress: () => void;
  handleSearchActionPress: () => void;
  hasActiveFilters: boolean;
  isViewSwitcherLocked: boolean;
  onSelectView: (view: SavedRehearsalLibraryView) => void;
  searchPanelVisibility: SearchPanelVisibility;
  searchState: ReturnType<typeof useSavedRehearsalLibrarySearch>;
  selectedView: SavedRehearsalLibraryView;
};

export const SavedRehearsalLibraryViewSwitcher = ({
  isViewSwitcherLocked,
  onSelectView,
  selectedView,
}: Pick<
  SavedRehearsalLibrarySearchShellProps,
  'isViewSwitcherLocked' | 'onSelectView' | 'selectedView'
>) => {
  return (
    <ScrollView
      contentContainerStyle={styles.viewRowContent}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.viewRow}
    >
      {SAVED_REHEARSAL_LIBRARY_VIEW_OPTIONS.map((option) => {
        return (
          <InteractionChip
            key={option.value}
            accessibilityLabel={`Show ${option.label} library view`}
            disabled={isViewSwitcherLocked}
            label={option.label}
            onPress={() => {
              onSelectView(option.value);
            }}
            style={styles.viewChip}
            variant={selectedView === option.value ? 'selected' : 'passive'}
          />
        );
      })}
    </ScrollView>
  );
};

export const SavedRehearsalLibraryHeader = ({
  authorization,
  canShowSearch,
  closeSearchAccessibilityLabel,
  handleFilterActionPress,
  handleSearchActionPress,
  hasActiveFilters,
  headerPlaybackAction,
  hideFiltersAccessibilityLabel,
  isSessionMenuVisible,
  onCloseSessionMenu,
  onToggleSessionMenu,
  searchAccessibilityLabel,
  searchPanelVisibility,
  showFiltersAccessibilityLabel,
  style,
}: SavedRehearsalLibraryHeaderProps) => {
  const headerModel = getDestinationHeaderModel('library');

  return (
    <DestinationHeader
      style={style}
      trailingAction={
        <View style={styles.headerActionRow}>
          {headerPlaybackAction ? (
            <CompactPlaybackAction
              accessibilityLabel={headerPlaybackAction.accessibilityLabel}
              disabled={headerPlaybackAction.disabled}
              iconName="play"
              onPress={headerPlaybackAction.onPress}
              variant="row"
            />
          ) : null}
          <LibrarySearchControlsActions
            canShowSearch={canShowSearch}
            closeSearchAccessibilityLabel={closeSearchAccessibilityLabel}
            hasActiveFilters={hasActiveFilters}
            hideFiltersAccessibilityLabel={hideFiltersAccessibilityLabel}
            isFilterPopoverVisible={
              searchPanelVisibility.isFilterPopoverVisible
            }
            isSearchBarVisible={searchPanelVisibility.isSearchBarVisible}
            onFilterActionPress={() => {
              onCloseSessionMenu();
              handleFilterActionPress();
            }}
            onSearchActionPress={() => {
              onCloseSessionMenu();
              handleSearchActionPress();
            }}
            searchAccessibilityLabel={searchAccessibilityLabel}
            showFiltersAccessibilityLabel={showFiltersAccessibilityLabel}
            tone="hero"
          />
          {authorization ? (
            <DriveSessionMenu
              authState={authorization.authState}
              canClearAuthorization={authorization.canClearAuthorization}
              canStartAuthorization={authorization.canStartAuthorization}
              isBusy={authorization.isBusy}
              isVisible={isSessionMenuVisible}
              onClearAuthorization={() => {
                onCloseSessionMenu();
                void authorization.clearAuthorization();
              }}
              onStartAuthorization={() => {
                onCloseSessionMenu();
                void authorization.startAuthorization();
              }}
              onToggleVisibility={onToggleSessionMenu}
              requestReady={authorization.requestReady}
              statusCopy={authorization.statusCopy}
            />
          ) : null}
        </View>
      }
      title={headerModel.title}
    />
  );
};

export const SavedRehearsalLibrarySearchShell = ({
  currentFilesFolderName,
  handleFilterActionPress,
  handleSearchActionPress,
  hasActiveFilters,
  isViewSwitcherLocked,
  onSelectView,
  searchPanelVisibility,
  searchState,
  selectedView,
}: SavedRehearsalLibrarySearchShellProps) => {
  return (
    <View style={styles.shell}>
      <SavedRehearsalLibraryViewSwitcher
        isViewSwitcherLocked={isViewSwitcherLocked}
        onSelectView={onSelectView}
        selectedView={selectedView}
      />
      <LibrarySearchControls
        availableTagFilters={searchState.availableTagFilters}
        currentFilesFolderName={currentFilesFolderName}
        entityFilter={searchState.entityFilter}
        filesSearchScope={searchState.filesSearchScope}
        filesSortDirection={searchState.filesSortDirection}
        filesSortMode={searchState.filesSortMode}
        hasActiveFilters={hasActiveFilters}
        isFilterPopoverVisible={searchPanelVisibility.isFilterPopoverVisible}
        isSearchBarVisible={searchPanelVisibility.isSearchBarVisible}
        onClearSearch={searchState.clearLibrarySearch}
        onFilterActionPress={handleFilterActionPress}
        onSearch={searchState.submitLibrarySearch}
        onSearchActionPress={handleSearchActionPress}
        onSearchInputBlur={searchState.commitLibrarySearchQuery}
        onSearchQueryChange={searchState.handleLibrarySearchQueryChange}
        onSelectEntityFilter={searchState.setEntityFilter}
        onSelectFilesSearchScope={searchState.setFilesSearchScope}
        onSelectFilesSortMode={searchState.setFilesSortMode}
        onSelectLoopsSortField={searchState.setLoopsSortField}
        onSelectPlaylistsSortField={searchState.setPlaylistsSortField}
        onSelectRecentSearchTerm={searchState.runLibrarySearch}
        onSelectSourcesSortField={searchState.setSourcesSortField}
        onSelectTagFilterMatchMode={searchState.setTagFilterMatchMode}
        onSelectTagsSortField={searchState.setTagsSortField}
        onToggleFilesSortDirection={searchState.toggleFilesSortDirection}
        onToggleLoopsSortDirection={searchState.toggleLoopsSortDirection}
        onTogglePlaylistsSortDirection={
          searchState.togglePlaylistsSortDirection
        }
        onToggleSourcesSortDirection={searchState.toggleSourcesSortDirection}
        onToggleTagFilter={searchState.toggleTagFilter}
        onToggleTagsSortDirection={searchState.toggleTagsSortDirection}
        loopsSortState={searchState.loopsSortState}
        playlistsSortState={searchState.playlistsSortState}
        recentSearchTerms={searchState.recentLibrarySearchTerms}
        selectedView={selectedView}
        selectedTagFilters={searchState.selectedTagFilters}
        searchQuery={searchState.librarySearchQuery}
        sourcesSortState={searchState.sourcesSortState}
        tagFilterMatchMode={searchState.tagFilterMatchMode}
        tagsSortState={searchState.tagsSortState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shell: {
    gap: 12,
  },
  viewChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewRow: {
    maxHeight: 48,
  },
  viewRowContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
});
