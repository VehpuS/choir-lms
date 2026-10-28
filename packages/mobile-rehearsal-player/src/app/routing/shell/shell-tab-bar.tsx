import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { styles } from './mobile-shell-styles';
import { SHELL_DESTINATIONS, type ShellDestinationKey } from './shell-model';
import { PracticeToolsControl } from '../../library/practice-tools/practice-tools-control';
import {
  getPracticeToolsTabPresentation,
  getShellTabPresentation,
} from './shell-tab-bar-model';

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
            aria-current={isActive ? 'page' : undefined}
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
      {/* The tools need no track, so they live here rather than in the mini-player. */}
      <PracticeToolsControl
        anchorStyle={styles.tabAnchor}
        menuPlacement={styles.practiceToolsMenu}
        renderTrigger={({
          accessibilityLabel,
          isActive,
          isExpanded,
          onPress,
        }) => {
          const presentation = getPracticeToolsTabPresentation(isActive);

          return (
            <Pressable
              accessibilityLabel={accessibilityLabel}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded, selected: isActive }}
              aria-expanded={isExpanded}
              onPress={onPress}
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
                Practice tools
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
};
