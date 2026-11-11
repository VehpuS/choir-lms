import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { railBleedStyle } from './dock-bleed';
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
  /**
   * `horizontal` is the bottom tab bar; `vertical` is the side rail of the
   * wide-short layout: the same entries and active state in a column, with the
   * Practice tools menu opening to the right of its entry.
   */
  orientation?: 'horizontal' | 'vertical';
};

const TAB_ICON_SIZE = 21;
// The rail is narrow, so its Practice tools entry reads `Tools`; its accessible
// name stays the full `Practice tools`.
const RAIL_PRACTICE_TOOLS_LABEL = 'Tools';

export const ShellTabBar = ({
  activeDestination,
  onSelectDestination,
  orientation = 'horizontal',
}: ShellTabBarProps) => {
  const isRail = orientation === 'vertical';
  const tabStyle = isRail ? styles.railTab : styles.tab;

  return (
    <View style={isRail ? [styles.rail, railBleedStyle] : styles.tabBar}>
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
              tabStyle,
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
        anchorStyle={isRail ? undefined : styles.tabAnchor}
        menuPlacement={
          isRail ? styles.practiceToolsRailMenu : styles.practiceToolsMenu
        }
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
                tabStyle,
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
                {isRail ? RAIL_PRACTICE_TOOLS_LABEL : 'Practice tools'}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
};
