import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { styles } from './mobile-shell-styles';
import { SHELL_DESTINATIONS, type ShellDestinationKey } from './shell-model';
import { getShellTabPresentation } from './shell-tab-bar-model';

type ShellTabBarProps = {
  activeDestination: ShellDestinationKey;
  onSelectDestination: (destination: ShellDestinationKey) => void;
};

const TAB_ICON_SIZE = 21;

export const ShellTabBar = ({
  activeDestination,
  onSelectDestination,
}: ShellTabBarProps) => {
  return (
    <View style={styles.tabBar}>
      {SHELL_DESTINATIONS.map((destination) => {
        const isActive = destination.key === activeDestination;
        const presentation = getShellTabPresentation(destination.key, isActive);

        return (
          <Pressable
            key={destination.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              onSelectDestination(destination.key);
            }}
            style={({ pressed }) => [
              styles.tab,
              pressed ? styles.tabPressed : null,
            ]}
          >
            <View
              style={[
                styles.tabMark,
                presentation.showActiveMark ? styles.tabMarkActive : null,
              ]}
            />
            <AppIcon
              color={presentation.color}
              name={presentation.iconName}
              size={TAB_ICON_SIZE}
            />
            <Text style={[styles.tabLabel, { color: presentation.color }]}>
              {destination.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
