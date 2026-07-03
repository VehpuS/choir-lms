import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { shouldShowRecentSearchSuggestions } from './contextual-search-panel-model';
import { RecentSearchSuggestions } from './recent-search-suggestions';

type ContextualSearchPanelProps = {
  canShowRecentSearchTerms?: boolean;
  clearActionLabel: string;
  helperCopy?: string;
  isSearchBarVisible: boolean;
  isSubmitDisabled?: boolean;
  onClearSearch: () => void;
  onSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onToggleSearchBar: () => void;
  onSelectRecentSearchTerm: (value: string) => void;
  placeholderCopy: string;
  recentSearchTerms: string[];
  searchAccessibilityLabel: string;
  searchQuery: string;
  showInlineToggleButton?: boolean;
};

const BORDER_COLOR = '#d6d1c4';
const INPUT_BACKGROUND = '#fff9f0';
const PLACEHOLDER_TEXT = '#857b6c';
const PRIMARY_ACTION_BACKGROUND = '#305c4d';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';
const HELPER_TEXT = '#5f5647';

export const ContextualSearchPanel = ({
  canShowRecentSearchTerms = true,
  clearActionLabel,
  helperCopy,
  isSearchBarVisible,
  isSubmitDisabled = false,
  onClearSearch,
  onSearch,
  onSearchQueryChange,
  onToggleSearchBar,
  onSelectRecentSearchTerm,
  placeholderCopy,
  recentSearchTerms,
  searchAccessibilityLabel,
  searchQuery,
  showInlineToggleButton = true,
}: ContextualSearchPanelProps) => {
  const shouldShowSuggestions = shouldShowRecentSearchSuggestions({
    canShowRecentSearchTerms: canShowRecentSearchTerms && isSearchBarVisible,
    recentSearchTerms,
    searchQuery,
  });
  const shouldShowClearButton =
    isSearchBarVisible && searchQuery.trim().length > 0;

  if (!isSearchBarVisible) {
    return (
      <Pressable
        accessibilityLabel={searchAccessibilityLabel}
        accessibilityRole="button"
        onPress={onToggleSearchBar}
        style={({ pressed }) => [
          styles.searchButton,
          pressed ? styles.searchButtonPressed : undefined,
        ]}
      >
        <MaterialCommunityIcons
          color={PRIMARY_ACTION_TEXT}
          name="magnify"
          size={18}
        />
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
        <View style={styles.searchInputContainer}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onSearchQueryChange}
            onSubmitEditing={onSearch}
            placeholder={placeholderCopy}
            placeholderTextColor={PLACEHOLDER_TEXT}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchQuery}
          />
          {shouldShowClearButton ? (
            <Pressable
              accessibilityLabel={clearActionLabel}
              accessibilityRole="button"
              onPress={onClearSearch}
              style={({ pressed }) => [
                styles.clearSearchIconButton,
                pressed ? styles.clearSearchIconButtonPressed : undefined,
              ]}
            >
              <MaterialCommunityIcons
                color={PLACEHOLDER_TEXT}
                name="close-circle-outline"
                size={18}
              />
            </Pressable>
          ) : null}
        </View>
        {showInlineToggleButton ? (
          <Pressable
            accessibilityLabel="Close search"
            accessibilityRole="button"
            onPress={onToggleSearchBar}
            style={({ pressed }) => [
              styles.searchButton,
              styles.searchButtonActive,
              pressed ? styles.searchButtonPressed : undefined,
              isSubmitDisabled ? styles.searchButtonDisabled : undefined,
            ]}
          >
            <MaterialCommunityIcons
              color={PRIMARY_ACTION_TEXT}
              name="close"
              size={18}
            />
          </Pressable>
        ) : null}
      </View>
      {shouldShowSuggestions ? (
        <RecentSearchSuggestions
          onSelectRecentSearchTerm={onSelectRecentSearchTerm}
          recentSearchTerms={recentSearchTerms}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  searchPanel: {
    gap: 12,
  },
  copyRow: {
    gap: 4,
  },
  helperCopy: {
    color: HELPER_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    paddingHorizontal: 16,
    paddingRight: 42,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    backgroundColor: INPUT_BACKGROUND,
    color: PRIMARY_TEXT,
    fontSize: 15,
  },
  searchButton: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonActive: {
    backgroundColor: '#214739',
  },
  searchButtonPressed: {
    opacity: 0.88,
  },
  searchButtonDisabled: {
    opacity: 0.56,
  },
  clearSearchIconButton: {
    position: 'absolute',
    top: 0,
    right: 10,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchIconButtonPressed: {
    opacity: 0.72,
  },
});
