import { View } from 'react-native';

import { OfflineFilesScreen } from '../../../screens/offline-files';
import { useIsOfflineFilesOpen } from '../../../screens/offline-files/offline-files-navigation-store';
import { SettingsScreen } from '../../../screens/settings';
import { useIsSettingsOpen } from '../../../screens/settings/settings-navigation-store';
import { styles } from '../mobile-shell-styles';

/** Full-screen surfaces opened from the account menu, over the destinations. */
export const ShellOverlays = () => {
  const isSettingsOpen = useIsSettingsOpen();
  const isOfflineFilesOpen = useIsOfflineFilesOpen();

  return (
    <>
      {isSettingsOpen ? (
        <View style={styles.settingsOverlay}>
          <SettingsScreen />
        </View>
      ) : null}
      {isOfflineFilesOpen ? (
        <View style={styles.settingsOverlay}>
          <OfflineFilesScreen />
        </View>
      ) : null}
    </>
  );
};
