import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '../../components/app-icon';
import { appTheme } from '../../utils/theme';
import { styles } from './mobile-shell-styles';
import { SHELL_DESTINATIONS, type ShellDestinationKey } from './shell-model';

type ShellTabBarProps = {
  activeDestination: ShellDestinationKey;
  onSelectDestination: (destination: ShellDestinationKey) => void;
};

const ACTIVE_TAB_ICON_COLOR = appTheme.colors.accentOnTint;
const INACTIVE_TAB_ICON_COLOR = appTheme.colors.secondaryText;

const TAB_ICONS: Record<
  ShellDestinationKey,
  {
    active: AppIconName;
    inactive: AppIconName;
  }
> = {
  recents: {
    active: 'history',
    inactive: 'history',
  },
  add: {
    active: 'folder-plus',
    inactive: 'folder-plus-outline',
  },
  library: {
    active: 'music-note',
    inactive: 'music-note-outline',
  },
};

export const ShellTabBar = ({
  activeDestination,
  onSelectDestination,
}: ShellTabBarProps) => {
  return (
    <View style={styles.tabBar}>
      {SHELL_DESTINATIONS.map((destination) => {
        const isActive = destination.key === activeDestination;
        const icon = TAB_ICONS[destination.key];

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
              isActive ? styles.tabActive : null,
              pressed ? styles.tabPressed : null,
            ]}
          >
            <View style={styles.tabContent}>
              <AppIcon
                color={
                  isActive ? ACTIVE_TAB_ICON_COLOR : INACTIVE_TAB_ICON_COLOR
                }
                name={isActive ? icon.active : icon.inactive}
                size={18}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : null,
                ]}
              >
                {destination.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};
