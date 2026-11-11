import type { ReactNode } from 'react';
import { View } from 'react-native';

import { styles } from '../mobile-shell-styles';
import { SHELL_DESTINATIONS, type ShellDestinationKey } from '../shell-model';

type MobileShellDestinationPanelsProps = {
  activeDestination: ShellDestinationKey;
  addScreen: (isActive: boolean) => ReactNode;
  libraryScreen: (isActive: boolean) => ReactNode;
  recentsScreen: ReactNode;
};

/**
 * One panel per destination, all kept mounted and only the active one shown,
 * so each screen keeps its state while another is in front. The Library and
 * Add screens are render props because they need to know when they stop being
 * the active destination.
 */
export const MobileShellDestinationPanels = ({
  activeDestination,
  addScreen,
  libraryScreen,
  recentsScreen,
}: MobileShellDestinationPanelsProps) => (
  <>
    {SHELL_DESTINATIONS.map((destination) => {
      const isPanelActive = activeDestination === destination.key;
      const panel =
        destination.key === 'library'
          ? libraryScreen(isPanelActive)
          : destination.key === 'add'
            ? addScreen(isPanelActive)
            : recentsScreen;

      return (
        <View
          key={destination.key}
          style={[
            styles.destinationPanel,
            isPanelActive
              ? styles.destinationPanelActive
              : styles.destinationPanelHidden,
          ]}
        >
          {panel}
        </View>
      );
    })}
  </>
);
