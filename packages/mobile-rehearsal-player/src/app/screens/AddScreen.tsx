import { ScrollView, StyleSheet } from 'react-native';

import { DriveDiscoveryPanel } from '../library/components/DriveDiscoveryPanel';
import type { useRehearsalLibraryScreenController } from '../library/hooks/use-rehearsal-library-screen-controller';
import { ADD_SCREEN_PANEL_ORDER } from '../library/utils/add-drive-layout';
import { appTheme } from '../utils/theme';

type AddScreenProps = {
  libraryController: ReturnType<typeof useRehearsalLibraryScreenController>;
};

export const AddScreen = ({ libraryController }: AddScreenProps) => {
  const renderedPanels = ADD_SCREEN_PANEL_ORDER.map((panelKey) => {
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
