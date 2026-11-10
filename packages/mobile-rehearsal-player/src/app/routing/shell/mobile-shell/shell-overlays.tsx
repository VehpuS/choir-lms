import { View } from 'react-native';

import { OfflineFilesScreen } from '../../../screens/offline-files';
import { useIsOfflineFilesOpen } from '../../../screens/offline-files/offline-files-navigation-store';
import { SettingsScreen } from '../../../screens/settings';
import { useIsSettingsOpen } from '../../../screens/settings/settings-navigation-store';
import { usePracticeDockHeight } from '../../../library/practice-tools/use-practice-dock-height';
import { styles } from '../mobile-shell-styles';
import { getOverlayBottomOffset } from './shell-overlays-model';

/** Full-screen surfaces opened from the account menu, over the destinations. */
export const ShellOverlays = () => {
  const isSettingsOpen = useIsSettingsOpen();
  const isOfflineFilesOpen = useIsOfflineFilesOpen();
  // The open practice tools dock below the content; the overlay reaches over
  // them so it, and the tools' own settings, are not squeezed above them.
  const overlayStyle = [
    styles.settingsOverlay,
    { bottom: getOverlayBottomOffset(usePracticeDockHeight()) },
  ];

  return (
    <>
      {isSettingsOpen ? (
        <View style={overlayStyle}>
          <SettingsScreen />
        </View>
      ) : null}
      {isOfflineFilesOpen ? (
        <View style={overlayStyle}>
          <OfflineFilesScreen />
        </View>
      ) : null}
    </>
  );
};
