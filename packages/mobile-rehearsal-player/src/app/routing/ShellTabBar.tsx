import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { appTheme } from '../utils/theme';
import { styles } from './mobile-shell-styles';
import { SHELL_DESTINATIONS, type ShellDestinationKey } from './shell-model';

type ShellTabBarProps = {
  activeDestination: ShellDestinationKey;
  onSelectDestination: (destination: ShellDestinationKey) => void;
};

const ACTIVE_TAB_ICON_COLOR = '#fff8ef';
const INACTIVE_TAB_ICON_COLOR = appTheme.colors.secondaryText;
type MaterialCommunityIconName = ComponentProps<
  typeof MaterialCommunityIcons
>['name'];

const TAB_ICONS: Record<
  ShellDestinationKey,
  {
    active: MaterialCommunityIconName;
    inactive: MaterialCommunityIconName;
  }
> = {
  home: {
    active: 'home',
    inactive: 'home-outline',
  },
  search: {
    active: 'magnify',
    inactive: 'magnify',
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
              <MaterialCommunityIcons
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
