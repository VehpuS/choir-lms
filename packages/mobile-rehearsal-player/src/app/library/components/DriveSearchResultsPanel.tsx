import { StyleSheet, View } from 'react-native';

import type { useRehearsalLibraryScreenController } from '../hooks/use-rehearsal-library-screen-controller';
import { DriveLibrarySearchPanel } from './DriveLibrarySearchPanel';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';

type DriveSearchResultsPanelProps = {
  controller: ReturnType<typeof useRehearsalLibraryScreenController>;
};

export const DriveSearchResultsPanel = ({
  controller,
}: DriveSearchResultsPanelProps) => {
  return (
    <View style={styles.section}>
      <DriveLibrarySearchPanel
        canSearch={controller.search.canSearch}
        isLoading={controller.search.isLoading}
        isSearchMode={controller.search.isSearchMode}
        onClearSearch={controller.search.clearSearch}
        onSearch={controller.search.submitSearch}
        onSearchQueryChange={controller.search.setSearchQuery}
        searchQuery={controller.search.searchQuery}
      />
      <DriveLibraryStatusCard
        isLoading={controller.search.isLoading}
        loadingLabel="Searching Google Drive…"
        statusCopy={controller.search.statusCopy}
      />
      <DriveLibrarySourceGroup
        getAction={controller.getSourceAction}
        getMessage={controller.getSourceMessage}
        sources={controller.search.playableSources}
        title={controller.search.playableSourceTitle}
      />
      <DriveLibrarySourceGroup
        sources={controller.search.unavailableSources}
        title={controller.search.unavailableSourceTitle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 20,
    backgroundColor: '#fffdf8',
  },
});
