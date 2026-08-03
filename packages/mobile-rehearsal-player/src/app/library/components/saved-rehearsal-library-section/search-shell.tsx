import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { DriveSessionMenu } from '../../../auth/google-drive/components/drive-session-menu';
import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { DestinationHeader } from '../../../components/destination-header';
import { getDestinationHeaderModel } from '../../../components/destination-header-model';
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

type SearchPanelVisibility = {
  isFilterPopoverVisible: boolean;
  isSearchBarVisible: boolean;
};

type SavedRehearsalLibraryHeaderProps = {
  authorization?: DriveSessionMenuController;
  handleFilterActionPress: () => void;
  handleSearchActionPress: () => void;
  isSessionMenuVisible: boolean;
  onCloseSessionMenu: () => void;
  onToggleSessionMenu: () => void;
  searchPanelVisibility: SearchPanelVisibility;
  searchState: ReturnType<typeof useSavedRehearsalLibrarySearch>;
  style?: StyleProp<ViewStyle>;
};

type SavedRehearsalLibrarySearchShellProps = {
  currentFilesFolderName: string | null;
  handleFilterActionPress: () => void;
  handleSearchActionPress: () => void;
  onSelectView: (view: SavedRehearsalLibraryView) => void;
  searchPanelVisibility: SearchPanelVisibility;
  searchState: ReturnType<typeof useSavedRehearsalLibrarySearch>;
  selectedView: SavedRehearsalLibraryView;
};

const SavedRehearsalLibraryViewSwitcher = ({
  onSelectView,
  selectedView,
}: Pick<
  SavedRehearsalLibrarySearchShellProps,
  'onSelectView' | 'selectedView'
>) => {
  return (
    <View style={styles.viewRow}>
      {SAVED_REHEARSAL_LIBRARY_VIEW_OPTIONS.map((option) => {
        return (
          <InteractionChip
            key={option.value}
            accessibilityLabel={`Show ${option.label} library view`}
            label={option.label}
            onPress={() => {
              onSelectView(option.value);
            }}
            style={styles.viewChip}
            variant={selectedView === option.value ? 'selected' : 'passive'}
          />
        );
      })}
    </View>
  );
};

export const SavedRehearsalLibraryHeader = ({
  authorization,
  handleFilterActionPress,
  handleSearchActionPress,
  isSessionMenuVisible,
  onCloseSessionMenu,
  onToggleSessionMenu,
  searchPanelVisibility,
  searchState,
  style,
}: SavedRehearsalLibraryHeaderProps) => {
  const headerModel = getDestinationHeaderModel('library');

  return (
    <DestinationHeader
      style={style}
      trailingAction={
        <View style={styles.headerActionRow}>
          <LibrarySearchControlsActions
            availabilityFilter={searchState.availabilityFilter}
            entityFilter={searchState.entityFilter}
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
            selectedTagFilters={searchState.selectedTagFilters}
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
  onSelectView,
  searchPanelVisibility,
  searchState,
  selectedView,
}: SavedRehearsalLibrarySearchShellProps) => {
  return (
    <View style={styles.shell}>
      <SavedRehearsalLibraryViewSwitcher
        onSelectView={onSelectView}
        selectedView={selectedView}
      />
      <LibrarySearchControls
        availableTagFilters={searchState.availableTagFilters}
        availabilityFilter={searchState.availabilityFilter}
        currentFilesFolderName={currentFilesFolderName}
        entityFilter={searchState.entityFilter}
        filesSearchScope={searchState.filesSearchScope}
        isFilterPopoverVisible={searchPanelVisibility.isFilterPopoverVisible}
        isSearchBarVisible={searchPanelVisibility.isSearchBarVisible}
        onClearSearch={searchState.clearLibrarySearch}
        onFilterActionPress={handleFilterActionPress}
        onSearch={searchState.submitLibrarySearch}
        onSearchActionPress={handleSearchActionPress}
        onSearchQueryChange={searchState.handleLibrarySearchQueryChange}
        onSelectAvailabilityFilter={searchState.setAvailabilityFilter}
        onSelectEntityFilter={searchState.setEntityFilter}
        onSelectFilesSearchScope={searchState.setFilesSearchScope}
        onSelectRecentSearchTerm={searchState.runLibrarySearch}
        onToggleTagFilter={searchState.toggleTagFilter}
        recentSearchTerms={searchState.recentLibrarySearchTerms}
        selectedView={selectedView}
        selectedTagFilters={searchState.selectedTagFilters}
        searchQuery={searchState.librarySearchQuery}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
