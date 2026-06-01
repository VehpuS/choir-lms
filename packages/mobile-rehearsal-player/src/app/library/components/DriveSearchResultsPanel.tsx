import { StyleSheet, View } from 'react-native';

import type { useRehearsalLibraryScreenController } from '../hooks/use-rehearsal-library-screen-controller';
import {
  shouldShowDriveStatusCard,
  shouldShowUnavailableSources,
} from '../utils/add-drive-layout';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';

type DriveSearchResultsPanelProps = {
  controller: ReturnType<typeof useRehearsalLibraryScreenController>;
};

export const DriveSearchResultsPanel = ({
  controller,
}: DriveSearchResultsPanelProps) => {
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
        getAction={controller.getSourceAction}
        getMessage={controller.getSourceMessage}
        sources={controller.search.playableSources}
        title={controller.search.playableSourceTitle}
      />
      {shouldShowUnavailableSources(
        controller.search.unavailableSources.length,
      ) ? (
        <DriveLibrarySourceGroup
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
    padding: 20,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 20,
    backgroundColor: '#fffdf8',
  },
});
