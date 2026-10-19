import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { styles } from './mobile-shell-styles';
import { SHELL_DESTINATIONS, type ShellDestinationKey } from './shell-model';
import { usePianoToggle } from '../../library/piano/piano-toggle';
import {
  getPianoTabPresentation,
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
  // The piano needs no track, so it lives here rather than in the mini-player.
  const pianoToggle = usePianoToggle();
  const pianoPresentation = getPianoTabPresentation(
    pianoToggle?.selected ?? false,
  );

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
      {pianoToggle ? (
        <Pressable
          accessibilityLabel={pianoToggle.accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ selected: pianoToggle.selected }}
          onPress={pianoToggle.toggle}
          style={({ pressed }) => [
            styles.tab,
            pressed ? styles.tabPressed : null,
          ]}
        >
          <View
            style={[
              styles.tabMark,
              pianoPresentation.showActiveMark ? styles.tabMarkActive : null,
            ]}
          />
          <AppIcon
            color={pianoPresentation.color}
            name={pianoPresentation.iconName}
            size={TAB_ICON_SIZE}
          />
          <Text style={[styles.tabLabel, { color: pianoPresentation.color }]}>
            Piano
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};
