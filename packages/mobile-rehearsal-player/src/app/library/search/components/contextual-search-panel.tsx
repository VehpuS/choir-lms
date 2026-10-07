import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import {
  resolveSearchInputBlurOutcome,
  shouldShowRecentSearchSuggestions,
} from './contextual-search-panel-model';
import { AppIcon } from '../../../components/app-icon';
import { RecentSearchSuggestions } from './recent-search-suggestions';

import { appTheme } from '../../../utils/theme';

type ContextualSearchPanelProps = {
  canShowRecentSearchTerms?: boolean;
  clearActionLabel: string;
  helperCopy?: string;
  /** Names the input for assistive tech when the placeholder alone does not. */
  inputAccessibilityLabel?: string;
  isSearchBarVisible: boolean;
  isSubmitDisabled?: boolean;
  onClearSearch: () => void;
  onSearch: () => void;
  onSearchInputBlur?: () => void;
  onSearchQueryChange: (value: string) => void;
  onToggleSearchBar: () => void;
  onSelectRecentSearchTerm: (value: string) => void;
  placeholderCopy: string;
  recentSearchTerms: string[];
  searchAccessibilityLabel: string;
  searchQuery: string;
  showInlineToggleButton?: boolean;
};

const { colors, space } = appTheme;
const PLACEHOLDER_TEXT = colors.textFaint;
const PRIMARY_ACTION_BACKGROUND = colors.surfaceAccent;
const PRIMARY_ACTION_TEXT = colors.accentOnTint;
const FIELD_ICON_SIZE = 18;

export const ContextualSearchPanel = ({
  canShowRecentSearchTerms = true,
  clearActionLabel,
  helperCopy,
  inputAccessibilityLabel,
  isSearchBarVisible,
  isSubmitDisabled = false,
  onClearSearch,
  onSearch,
  onSearchInputBlur,
  onSearchQueryChange,
  onToggleSearchBar,
  onSelectRecentSearchTerm,
  placeholderCopy,
  recentSearchTerms,
  searchAccessibilityLabel,
  searchQuery,
  showInlineToggleButton = true,
}: ContextualSearchPanelProps) => {
  const [isInputFocused, setIsInputFocused] = useState(false);
  const shouldSkipBlurCommitRef = useRef(false);
  const isSearchBarVisibleRef = useRef(isSearchBarVisible);

  useEffect(() => {
    isSearchBarVisibleRef.current = isSearchBarVisible;
  }, [isSearchBarVisible]);

  const markNextBlurAsInternal = () => {
    shouldSkipBlurCommitRef.current = true;
  };

  const shouldShowSuggestions = shouldShowRecentSearchSuggestions({
    canShowRecentSearchTerms: canShowRecentSearchTerms && isSearchBarVisible,
    recentSearchTerms,
    searchQuery,
  });
  const shouldShowClearButton =
    isSearchBarVisible && searchQuery.trim().length > 0;

  const handleSearchInputBlur = () => {
    setIsInputFocused(false);

    const blurOutcome = resolveSearchInputBlurOutcome({
      shouldSkipBlurCommit: shouldSkipBlurCommitRef.current,
    });

    shouldSkipBlurCommitRef.current = blurOutcome.nextShouldSkipBlurCommit;

    if (!blurOutcome.shouldCommitRecentSearch) {
      return;
    }

    setTimeout(() => {
      if (!isSearchBarVisibleRef.current) {
        return;
      }

      onSearchInputBlur?.();
    }, 0);
  };

  const handleClearSearch = () => {
    onClearSearch();
    setTimeout(() => {
      shouldSkipBlurCommitRef.current = false;
    }, 0);
  };

  if (!isSearchBarVisible) {
    return (
      <Pressable
        accessibilityLabel={searchAccessibilityLabel}
        accessibilityRole="button"
        {...interactionGuardProps}
        onPress={onToggleSearchBar}
        style={({ pressed }) => [
          styles.searchButton,
          buttonInteractionGuardStyle,
          pressed ? styles.searchButtonPressed : undefined,
        ]}
      >
        <AppIcon color={PRIMARY_ACTION_TEXT} name="magnify" size={18} />
      </Pressable>
    );
  }

  return (
    <View style={styles.searchPanel}>
      {helperCopy ? (
        <View style={styles.copyRow}>
          <Text style={styles.helperCopy}>{helperCopy}</Text>
        </View>
      ) : null}
      <View style={styles.searchRow}>
        {/* Screen 1j's field: one 44pt row with a leading search glyph and a
            trailing clear, edged in the accent while focused. */}
        <View
          style={[
            styles.searchField,
            isInputFocused ? styles.searchFieldFocused : undefined,
          ]}
        >
          <AppIcon
            color={isInputFocused ? colors.accentText : colors.icon}
            name="magnify"
            size={FIELD_ICON_SIZE}
          />
          <TextInput
            accessibilityLabel={inputAccessibilityLabel}
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={handleSearchInputBlur}
            onChangeText={onSearchQueryChange}
            onFocus={() => {
              setIsInputFocused(true);
              shouldSkipBlurCommitRef.current = false;
            }}
            onSubmitEditing={onSearch}
            placeholder={placeholderCopy}
            placeholderTextColor={PLACEHOLDER_TEXT}
            returnKeyType="search"
            selectionColor={colors.accent}
            style={styles.searchInput}
            value={searchQuery}
          />
          {shouldShowClearButton ? (
            <Pressable
              accessibilityLabel={clearActionLabel}
              accessibilityRole="button"
              {...interactionGuardProps}
              onPress={handleClearSearch}
              onPressIn={markNextBlurAsInternal}
              style={({ pressed }) => [
                styles.clearSearchIconButton,
                buttonInteractionGuardStyle,
                pressed ? styles.clearSearchIconButtonPressed : undefined,
              ]}
            >
              <AppIcon
                color={colors.textMuted}
                name="close-circle-outline"
                size={FIELD_ICON_SIZE}
              />
            </Pressable>
          ) : null}
        </View>
        {showInlineToggleButton ? (
          <Pressable
            accessibilityLabel="Close search"
            accessibilityRole="button"
            {...interactionGuardProps}
            onPress={onToggleSearchBar}
            onPressIn={markNextBlurAsInternal}
            style={({ pressed }) => [
              styles.searchButton,
              styles.searchButtonActive,
              buttonInteractionGuardStyle,
              pressed ? styles.searchButtonPressed : undefined,
              isSubmitDisabled ? styles.searchButtonDisabled : undefined,
            ]}
          >
            <AppIcon color={PRIMARY_ACTION_TEXT} name="close" size={18} />
          </Pressable>
        ) : null}
      </View>
      {shouldShowSuggestions ? (
        <RecentSearchSuggestions
          onSelectRecentSearchTerm={onSelectRecentSearchTerm}
          onSelectRecentSearchTermPressIn={markNextBlurAsInternal}
          recentSearchTerms={recentSearchTerms}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  searchPanel: {
    gap: space.sm,
  },
  copyRow: {
    gap: space.xxs,
  },
  helperCopy: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  searchField: {
    flex: 1,
    minHeight: space.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingLeft: space.md,
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: appTheme.radius.md,
    backgroundColor: colors.surface,
  },
  searchFieldFocused: {
    borderColor: colors.accent,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: space.touchTarget - 2,
    paddingVertical: 0,
    paddingRight: space.md,
    color: colors.text,
    fontSize: 15,
    // The field row draws its own accent focus edge; drop the browser's inner
    // focus ring on web (no effect on native). Chrome ignores the width of an
    // `auto` outline, so the style is set too.
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  searchButton: {
    alignSelf: 'flex-start',
    width: space.touchTarget,
    height: space.touchTarget,
    borderRadius: appTheme.radius.pill,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonActive: {
    backgroundColor: colors.accentBorderDeep,
  },
  searchButtonPressed: {
    opacity: 0.88,
  },
  searchButtonDisabled: {
    opacity: 0.56,
  },
  clearSearchIconButton: {
    width: space.touchTarget,
    height: space.touchTarget - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchIconButtonPressed: {
    opacity: 0.72,
  },
});
