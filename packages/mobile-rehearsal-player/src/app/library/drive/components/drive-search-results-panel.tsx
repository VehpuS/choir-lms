import { StyleSheet, View } from 'react-native';

import type { useRehearsalLibraryController } from '../../saved-rehearsal-library/use-rehearsal-library-controller';
import {
  shouldShowDriveStatusCard,
  shouldShowUnavailableSources,
} from '../utils/drive-discovery-layout';
import { DriveLibrarySourceGroup } from './drive-library-source-group';
import { DriveLibraryStatusCard } from './drive-library-status-card';

type DriveSearchResultsPanelProps = {
  controller: ReturnType<typeof useRehearsalLibraryController>;
};

export const DriveSearchResultsPanel = ({
  controller,
}: DriveSearchResultsPanelProps) => {
  if (!controller.search.isSearchMode) {
    return null;
  }

  const shouldShowStatusCard = shouldShowDriveStatusCard(
    controller.search.isLoading,
    controller.search.statusCopy.tone,
  );

  return (
    <View style={styles.section}>
      {shouldShowStatusCard ? (
        <DriveLibraryStatusCard
          isLoading={controller.search.isLoading}
          loadingLabel="Searching Google Drive…"
          statusCopy={controller.search.statusCopy}
        />
      ) : null}
      <DriveLibrarySourceGroup
        getActions={controller.getDriveSourceActions}
        getMessage={controller.getSourceMessage}
        highlightQuery={controller.search.activeSearchQuery}
        sources={controller.search.playableSources}
        title={controller.search.playableSourceTitle}
      />
      {shouldShowUnavailableSources(
        controller.search.unavailableSources.length,
      ) ? (
        <DriveLibrarySourceGroup
          highlightQuery={controller.search.activeSearchQuery}
          sources={controller.search.unavailableSources}
          title={controller.search.unavailableSourceTitle}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    backgroundColor: '#fffcf4',
  },
});
