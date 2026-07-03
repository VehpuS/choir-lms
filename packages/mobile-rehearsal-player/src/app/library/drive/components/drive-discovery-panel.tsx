import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { useRehearsalLibraryController } from '../../saved-rehearsal-library/use-rehearsal-library-controller';
import {
  shouldShowDriveStatusCard,
  shouldShowUnavailableSources,
} from '../utils/drive-discovery-layout';
import { DriveFolderGroup } from './drive-folder-group';
import { DriveLibraryBreadcrumbs } from './drive-library-breadcrumbs';
import { DriveLibraryRootSelector } from './drive-library-root-selector';
import { DriveLibrarySearchPanel } from './drive-library-search-panel';
import { DriveLibrarySectionHeader } from './drive-library-section-header';
import { DriveLibrarySourceGroup } from './drive-library-source-group';
import { DriveLibraryStatusCard } from './drive-library-status-card';
import { DriveSearchResultsPanel } from './drive-search-results-panel';

type DriveDiscoveryPanelProps = {
  controller: ReturnType<typeof useRehearsalLibraryController>;
};

type DriveDiscoveryActionButtonProps = {
  accessibilityLabel: string;
  iconName: 'close' | 'magnify' | 'progress-clock' | 'refresh';
  isDisabled?: boolean;
  onPress: () => void;
};

const ACTION_BUTTON_SIZE = 40;
const ACTION_ROW_GAP = 12;
const ACTION_ROW_WIDTH = ACTION_BUTTON_SIZE * 2 + ACTION_ROW_GAP;

const DriveDiscoveryActionButton = ({
  accessibilityLabel,
  iconName,
  isDisabled = false,
  onPress,
}: DriveDiscoveryActionButtonProps) => {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerActionButton,
        pressed ? styles.headerActionButtonPressed : undefined,
        isDisabled ? styles.headerActionButtonDisabled : undefined,
      ]}
    >
      <MaterialCommunityIcons color="#fff8ef" name={iconName} size={18} />
    </Pressable>
  );
};

export const DriveDiscoveryPanel = ({
  controller,
}: DriveDiscoveryPanelProps) => {
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const shouldShowStatusCard = shouldShowDriveStatusCard(
    controller.discovery.isLoading,
    controller.discovery.statusCopy.tone,
  );

  const handleToggleSearchBar = () => {
    if (isSearchBarVisible) {
      controller.search.deactivateSearch();
      setIsSearchBarVisible(false);
      return;
    }

    setIsSearchBarVisible(true);

    if (controller.search.searchQuery.trim().length > 0) {
      controller.search.submitSearch();
    }
  };

  const searchPanel = (
    <DriveLibrarySearchPanel
      canSearch={controller.search.canSearch}
      helperCopy={controller.search.searchContextCopy.helper}
      isLoading={controller.search.isLoading}
      isSearchBarVisible={isSearchBarVisible}
      onClearSearch={controller.search.clearSearch}
      onSearch={controller.search.submitSearch}
      onSearchQueryChange={controller.search.setSearchQuery}
      onSelectRecentSearchTerm={controller.search.submitSearchQuery}
      onToggleSearchBar={handleToggleSearchBar}
      placeholderCopy={controller.search.searchContextCopy.placeholder}
      recentSearchTerms={controller.search.recentSearchTerms}
      searchQuery={controller.search.searchQuery}
      showInlineToggleButton={false}
    />
  );

  return (
    <View style={styles.section}>
      <DriveLibrarySectionHeader
        canRefresh={controller.discovery.canRefresh}
        isLoading={controller.discovery.isLoading}
        onRefresh={controller.discovery.refresh}
        trailingAction={
          <View style={styles.headerActionRow}>
            {isSearchBarVisible || !controller.discovery.canRefresh ? (
              <View style={styles.headerActionSpacer} />
            ) : (
              <DriveDiscoveryActionButton
                accessibilityLabel={
                  controller.discovery.isLoading
                    ? 'Refreshing Drive'
                    : 'Refresh Drive'
                }
                iconName={
                  controller.discovery.isLoading ? 'progress-clock' : 'refresh'
                }
                isDisabled={controller.discovery.isLoading}
                onPress={controller.discovery.refresh}
              />
            )}
            <DriveDiscoveryActionButton
              accessibilityLabel={
                isSearchBarVisible ? 'Close search' : 'Search Google Drive'
              }
              iconName={isSearchBarVisible ? 'close' : 'magnify'}
              onPress={handleToggleSearchBar}
            />
          </View>
        }
        title="Browse Drive"
      />
      {isSearchBarVisible ? searchPanel : null}
      {isSearchBarVisible ? (
        <DriveSearchResultsPanel controller={controller} />
      ) : null}
      {!isSearchBarVisible ? (
        <>
          <DriveLibraryRootSelector
            currentRootKind={controller.discovery.currentLocation.rootKind}
            isSearchMode={false}
            onSelectRoot={controller.discovery.selectRoot}
          />
          <DriveLibraryBreadcrumbs
            navigationStack={controller.discovery.navigationStack}
            onGoToLocation={controller.discovery.goToLocation}
          />
          {shouldShowStatusCard ? (
            <DriveLibraryStatusCard
              isLoading={controller.discovery.isLoading}
              statusCopy={controller.discovery.statusCopy}
            />
          ) : null}
          <DriveFolderGroup
            folders={controller.discovery.browseSnapshot.folders}
            onOpenFolder={controller.discovery.openFolder}
            title={controller.discovery.folderTitle}
          />
          <DriveLibrarySourceGroup
            getActions={controller.getDriveSourceActions}
            getMessage={controller.getSourceMessage}
            sources={controller.discovery.playableSources}
            title={controller.discovery.playableSourceTitle}
          />
          {shouldShowUnavailableSources(
            controller.discovery.unavailableSources.length,
          ) ? (
            <DriveLibrarySourceGroup
              sources={controller.discovery.unavailableSources}
              title={controller.discovery.unavailableSourceTitle}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    position: 'relative',
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 20,
    backgroundColor: '#fffdf8',
  },
  headerActionRow: {
    width: ACTION_ROW_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActionSpacer: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
  },
  headerActionButton: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: 999,
    backgroundColor: '#173229',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionButtonPressed: {
    opacity: 0.88,
  },
  headerActionButtonDisabled: {
    opacity: 0.56,
  },
});
