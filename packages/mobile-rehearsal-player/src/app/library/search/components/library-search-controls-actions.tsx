import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { resolveSearchToggleIsFilled } from './library-search-controls-actions-model';

const ACTION_BUTTON_SIZE = 40;
const ACTION_ROW_GAP = 12;
const DOUBLE_ACTION_ROW_WIDTH = ACTION_BUTTON_SIZE * 2 + ACTION_ROW_GAP;
const SINGLE_ACTION_ROW_WIDTH = ACTION_BUTTON_SIZE;

type LibrarySearchControlsActionsProps = {
  canShowSearch?: boolean;
  closeSearchAccessibilityLabel?: string;
  hasActiveFilters: boolean;
  hideFiltersAccessibilityLabel?: string;
  isFilterPopoverVisible: boolean;
  isSearchBarVisible: boolean;
  onFilterActionPress: () => void;
  onSearchActionPress: () => void;
  searchAccessibilityLabel?: string;
  showFiltersAccessibilityLabel?: string;
  tone?: 'hero' | 'surface';
};

type LibrarySearchActionButtonProps = {
  accessibilityLabel: string;
  iconName: 'close' | 'magnify' | 'tune-variant';
  isFilled: boolean;
  onPress: () => void;
  showActiveIndicator?: boolean;
  tone: 'hero' | 'surface';
};

const LibrarySearchActionButton = ({
  accessibilityLabel,
  iconName,
  isFilled,
  onPress,
  showActiveIndicator = false,
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
      {showActiveIndicator ? (
        <View
          style={[
            styles.activeIndicatorDot,
            isHeroTone
              ? styles.activeIndicatorDotHero
              : styles.activeIndicatorDotSurface,
          ]}
        />
      ) : null}
    </Pressable>
  );
};

export const LibrarySearchControlsActions = ({
  canShowSearch = true,
  closeSearchAccessibilityLabel = 'Close search',
  hasActiveFilters,
  hideFiltersAccessibilityLabel = 'Hide library filters',
  isFilterPopoverVisible,
  isSearchBarVisible,
  onFilterActionPress,
  onSearchActionPress,
  searchAccessibilityLabel = 'Search saved library',
  showFiltersAccessibilityLabel = 'Show library filters',
  tone = 'surface',
}: LibrarySearchControlsActionsProps) => {
  return (
    <View
      style={[
        styles.actionRow,
        canShowSearch ? styles.actionRowDouble : styles.actionRowSingle,
      ]}
    >
      <LibrarySearchActionButton
        accessibilityLabel={
          isFilterPopoverVisible
            ? hideFiltersAccessibilityLabel
            : showFiltersAccessibilityLabel
        }
        iconName="tune-variant"
        isFilled={isFilterPopoverVisible}
        onPress={onFilterActionPress}
        showActiveIndicator={hasActiveFilters}
        tone={tone}
      />
      {canShowSearch ? (
        <LibrarySearchActionButton
          accessibilityLabel={
            isSearchBarVisible
              ? closeSearchAccessibilityLabel
              : searchAccessibilityLabel
          }
          iconName={isSearchBarVisible ? 'close' : 'magnify'}
          isFilled={resolveSearchToggleIsFilled(isSearchBarVisible)}
          onPress={onSearchActionPress}
          tone={tone}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  activeIndicatorDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#ffd27d',
  },
  activeIndicatorDotHero: {
    borderColor: '#173229',
  },
  activeIndicatorDotSurface: {
    borderColor: '#f7f1e7',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRowDouble: {
    width: DOUBLE_ACTION_ROW_WIDTH,
  },
  actionRowSingle: {
    width: SINGLE_ACTION_ROW_WIDTH,
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
