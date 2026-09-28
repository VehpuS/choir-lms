import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { resolveSearchToggleIsFilled } from './library-search-controls-actions-model';

import { appTheme } from '../../../utils/theme';

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
      <AppIcon
        color={
          isHeroTone
            ? isFilled
              ? appTheme.colors.accentOnTint
              : appTheme.colors.icon
            : isFilled
              ? appTheme.colors.accentOnTint
              : appTheme.colors.accentText
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
    backgroundColor: appTheme.colors.warning,
  },
  activeIndicatorDotHero: {
    borderColor: appTheme.colors.surfaceRaised,
  },
  activeIndicatorDotSurface: {
    borderColor: appTheme.colors.surface,
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
    borderColor: appTheme.colors.accent,
    backgroundColor: appTheme.colors.surfaceAccent,
  },
  actionButtonFilledSurface: {
    borderColor: appTheme.colors.accent,
    backgroundColor: appTheme.colors.surfaceAccent,
  },
  actionButtonHero: {
    borderColor: appTheme.colors.borderButton,
    backgroundColor: appTheme.colors.surface,
  },
  actionButtonPressed: { opacity: 0.8 },
  actionButtonSurface: {
    borderColor: appTheme.colors.borderButton,
    backgroundColor: appTheme.colors.surface,
  },
});
