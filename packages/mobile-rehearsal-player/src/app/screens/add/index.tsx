import { ScrollView, StyleSheet } from 'react-native';

import { DriveDiscoveryPanel } from '../../library/drive/components/drive-discovery-panel';
import { ADD_SCREEN_DRIVE_PANEL_ORDER } from '../../library/drive/utils/drive-discovery-layout';
import type { useRehearsalLibraryController } from '../../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { appTheme } from '../../utils/theme';

type AddScreenProps = {
  libraryController: ReturnType<typeof useRehearsalLibraryController>;
};

export const AddScreen = ({ libraryController }: AddScreenProps) => {
  const renderedPanels = ADD_SCREEN_DRIVE_PANEL_ORDER.map((panelKey) => {
    return (
      <DriveDiscoveryPanel controller={libraryController} key={panelKey} />
    );
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      {renderedPanels}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
  content: {
    gap: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },
});
