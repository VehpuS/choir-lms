import { StyleSheet, View } from 'react-native';

import type { useRehearsalLibraryScreenController } from '../hooks/use-rehearsal-library-screen-controller';
import { DriveFolderGroup } from './DriveFolderGroup';
import { DriveLibraryBreadcrumbs } from './DriveLibraryBreadcrumbs';
import { DriveLibraryRootSelector } from './DriveLibraryRootSelector';
import { DriveLibrarySectionHeader } from './DriveLibrarySectionHeader';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';

type DriveDiscoveryPanelProps = {
  controller: ReturnType<typeof useRehearsalLibraryScreenController>;
};

export const DriveDiscoveryPanel = ({
  controller,
}: DriveDiscoveryPanelProps) => {
  return (
    <View style={styles.section}>
      <DriveLibrarySectionHeader
        canRefresh={controller.discovery.canRefresh}
        eyebrow="Discovery"
        isLoading={controller.discovery.isLoading}
        onRefresh={controller.discovery.refresh}
        title="Browse Drive"
      />
      <DriveLibraryRootSelector
        currentRootKind={controller.discovery.currentLocation.rootKind}
        isSearchMode={false}
        onSelectRoot={controller.discovery.selectRoot}
      />
      <DriveLibraryBreadcrumbs
        navigationStack={controller.discovery.navigationStack}
        onGoToLocation={controller.discovery.goToLocation}
      />
      <DriveLibraryStatusCard
        isLoading={controller.discovery.isLoading}
        statusCopy={controller.discovery.statusCopy}
      />
      <DriveFolderGroup
        folders={controller.discovery.browseSnapshot.folders}
        onOpenFolder={controller.discovery.openFolder}
        title={controller.discovery.folderTitle}
      />
      <DriveLibrarySourceGroup
        getAction={controller.getSourceAction}
        getMessage={controller.getSourceMessage}
        sources={controller.discovery.playableSources}
        title={controller.discovery.playableSourceTitle}
      />
      <DriveLibrarySourceGroup
        sources={controller.discovery.unavailableSources}
        title={controller.discovery.unavailableSourceTitle}
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
