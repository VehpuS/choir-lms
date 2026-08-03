import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

const ACTION_BUTTON_SIZE = 40;
const ACTION_ROW_GAP = 12;
const ACTION_ROW_WIDTH = ACTION_BUTTON_SIZE * 2 + ACTION_ROW_GAP;

type LibrarySearchControlsActionsProps = {
  availabilityFilter: 'all' | 'available' | 'unavailable';
  entityFilter: 'all' | 'tracks' | 'loops' | 'playlists';
  isFilterPopoverVisible: boolean;
  isSearchBarVisible: boolean;
  onFilterActionPress: () => void;
  onSearchActionPress: () => void;
  selectedTagFilters: string[];
  tone?: 'hero' | 'surface';
};

type LibrarySearchActionButtonProps = {
  accessibilityLabel: string;
  iconName: 'close' | 'magnify' | 'tune-variant';
  isFilled: boolean;
  onPress: () => void;
  tone: 'hero' | 'surface';
};

const LibrarySearchActionButton = ({
  accessibilityLabel,
  iconName,
  isFilled,
  onPress,
  tone,
}: LibrarySearchActionButtonProps) => {
  const isHeroTone = tone === 'hero';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isHeroTone ? styles.actionButtonHero : styles.actionButtonSurface,
        isFilled
          ? isHeroTone
            ? styles.actionButtonFilledHero
            : styles.actionButtonFilledSurface
          : undefined,
        pressed ? styles.actionButtonPressed : undefined,
      ]}
    >
      <MaterialCommunityIcons
        color={
          isHeroTone
            ? isFilled
              ? '#173229'
              : '#fff8ef'
            : isFilled
              ? '#fff8ef'
              : '#305c4d'
        }
        name={iconName}
        size={18}
      />
    </Pressable>
  );
};

export const LibrarySearchControlsActions = ({
  availabilityFilter,
  entityFilter,
  isFilterPopoverVisible,
  isSearchBarVisible,
  onFilterActionPress,
  onSearchActionPress,
  selectedTagFilters,
  tone = 'surface',
}: LibrarySearchControlsActionsProps) => {
  const hasActiveFilters =
    entityFilter !== 'all' ||
    availabilityFilter !== 'all' ||
    selectedTagFilters.length > 0;

  return (
    <View style={styles.actionRow}>
      <LibrarySearchActionButton
        accessibilityLabel={
          isFilterPopoverVisible
            ? 'Hide library filters'
            : 'Show library filters'
        }
        iconName="tune-variant"
        isFilled={isFilterPopoverVisible || hasActiveFilters}
        onPress={onFilterActionPress}
        tone={tone}
      />
      <LibrarySearchActionButton
        accessibilityLabel={
          isSearchBarVisible ? 'Close search' : 'Search saved library'
        }
        iconName={isSearchBarVisible ? 'close' : 'magnify'}
        isFilled={true}
        onPress={onSearchActionPress}
        tone={tone}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    width: ACTION_ROW_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionButtonFilledHero: {
    borderColor: '#fff8ef',
    backgroundColor: '#fff8ef',
  },
  actionButtonFilledSurface: {
    borderColor: '#305c4d',
    backgroundColor: '#305c4d',
  },
  actionButtonHero: {
    borderColor: 'rgba(255, 248, 239, 0.26)',
    backgroundColor: 'rgba(255, 248, 239, 0.08)',
  },
  actionButtonPressed: { opacity: 0.8 },
  actionButtonSurface: {
    borderColor: '#c8c0b2',
    backgroundColor: '#f7f1e7',
  },
});
