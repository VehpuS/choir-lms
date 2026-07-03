import { type DriveBrowseLocation } from '@org/google-drive';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DriveLibrarySourceAction } from '../../utils/drive-library-source-actions';
import type {
  DriveLibraryFolder,
  DriveLibrarySource,
  DriveLibraryStatusCopy,
} from '../../utils/drive-library-view-model';
import { DriveFolderGroup } from '../drive-folder-group';
import { DriveLibraryBreadcrumbs } from '../drive-library-breadcrumbs';
import { DriveLibraryRootSelector } from '../drive-library-root-selector';
import { DriveLibrarySearchPanel } from '../drive-library-search-panel';
import { DriveLibrarySectionHeader } from '../drive-library-section-header';
import { DriveLibrarySourceGroup } from '../drive-library-source-group';
import { DriveLibraryStatusCard } from '../drive-library-status-card';

type DriveLibraryContentProps = {
  canRefresh: boolean;
  currentRootKind: 'my-drive' | 'shared';
  folderTitle: string;
  folders: DriveLibraryFolder[];
  getPlayableSourceAction: (
    source: DriveLibrarySource,
  ) => DriveLibrarySourceAction | null;
  getPlayableSourceMessage: (source: DriveLibrarySource) => string | undefined;
  goToLocation: (index: number) => void;
  isLoading: boolean;
  isSearchMode: boolean;
  navigationStack: DriveBrowseLocation[];
  onClearSearch: () => void;
  onOpenFolder: (folder: DriveLibraryFolder) => void;
  onRefresh: () => void;
  onSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectRecentSearchTerm: (query: string) => void;
  onSelectRoot: (rootKind: 'my-drive' | 'shared') => void;
  playableSourceTitle: string;
  playableSources: DriveLibrarySource[];
  recentSearchTerms: string[];
  savedLibraryPanel: ReactNode;
  searchQuery: string;
  statusCopy: DriveLibraryStatusCopy;
  unavailableSourceTitle: string;
  unavailableSources: DriveLibrarySource[];
};

const BORDER_COLOR = '#d6d1c4';
const CARD_BACKGROUND = '#fffdf8';

export const DriveLibraryContent = ({
  canRefresh,
  currentRootKind,
  folderTitle,
  folders,
  getPlayableSourceAction,
  getPlayableSourceMessage,
  goToLocation,
  isLoading,
  isSearchMode,
  navigationStack,
  onClearSearch,
  onOpenFolder,
  onRefresh,
  onSearch,
  onSearchQueryChange,
  onSelectRecentSearchTerm,
  onSelectRoot,
  playableSourceTitle,
  playableSources,
  recentSearchTerms,
  savedLibraryPanel,
  searchQuery,
  statusCopy,
  unavailableSourceTitle,
  unavailableSources,
}: DriveLibraryContentProps) => {
  return (
    <View style={styles.section}>
      <DriveLibrarySectionHeader
        canRefresh={canRefresh}
        isLoading={isLoading}
        onRefresh={onRefresh}
      />
      <DriveLibrarySearchPanel
        canSearch={canRefresh}
        helperCopy="Search in My Drive"
        isLoading={isLoading}
        onClearSearch={onClearSearch}
        onSearch={onSearch}
        onSearchQueryChange={onSearchQueryChange}
        onSelectRecentSearchTerm={onSelectRecentSearchTerm}
        placeholderCopy="Search in My Drive"
        recentSearchTerms={recentSearchTerms}
        searchQuery={searchQuery}
      />
      <DriveLibraryRootSelector
        currentRootKind={currentRootKind}
        isSearchMode={isSearchMode}
        onSelectRoot={onSelectRoot}
      />
      {!isSearchMode ? (
        <DriveLibraryBreadcrumbs
          navigationStack={navigationStack}
          onGoToLocation={goToLocation}
        />
      ) : null}
      <DriveLibraryStatusCard isLoading={isLoading} statusCopy={statusCopy} />
      {savedLibraryPanel}
      {!isSearchMode ? (
        <DriveFolderGroup
          folders={folders}
          onOpenFolder={onOpenFolder}
          title={folderTitle}
        />
      ) : null}
      <DriveLibrarySourceGroup
        getAction={getPlayableSourceAction}
        getMessage={getPlayableSourceMessage}
        sources={playableSources}
        title={playableSourceTitle}
      />
      <DriveLibrarySourceGroup
        sources={unavailableSources}
        title={unavailableSourceTitle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 20,
    backgroundColor: CARD_BACKGROUND,
  },
});
