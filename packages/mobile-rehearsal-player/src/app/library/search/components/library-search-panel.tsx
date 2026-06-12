import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getLibrarySearchContextCopy } from '../../drive/utils/drive-library-view-model';
import { RecentSearchSuggestions } from './recent-search-suggestions';

type LibrarySearchPanelProps = {
  isSearchMode: boolean;
  onClearSearch: () => void;
  onSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectRecentSearchTerm: (value: string) => void;
  recentSearchTerms: string[];
  searchQuery: string;
};

const BORDER_COLOR = '#d6d1c4';
const INPUT_BACKGROUND = '#fff9f0';
const PLACEHOLDER_TEXT = '#857b6c';
const PRIMARY_ACTION_BACKGROUND = '#305c4d';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_ACTION_TEXT = '#305c4d';

export const LibrarySearchPanel = ({
  isSearchMode,
  onClearSearch,
  onSearch,
  onSearchQueryChange,
  onSelectRecentSearchTerm,
  recentSearchTerms,
  searchQuery,
}: LibrarySearchPanelProps) => {
  const searchContextCopy = getLibrarySearchContextCopy();
  const shouldShowRecentSearchTerms =
    searchQuery.trim().length === 0 && recentSearchTerms.length > 0;

  return (
    <View style={styles.searchPanel}>
      <View style={styles.copyRow}>
        <Text style={styles.helperCopy}>{searchContextCopy.helper}</Text>
      </View>
      <View style={styles.searchRow}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onSearchQueryChange}
          onSubmitEditing={onSearch}
          placeholder="Search saved library"
          placeholderTextColor={PLACEHOLDER_TEXT}
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
        />
        <Pressable
          accessibilityLabel="Search saved library"
          accessibilityRole="button"
          onPress={onSearch}
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
      </View>
      {shouldShowRecentSearchTerms ? (
        <RecentSearchSuggestions
          onSelectRecentSearchTerm={onSelectRecentSearchTerm}
          recentSearchTerms={recentSearchTerms}
        />
      ) : null}
      {isSearchMode ? (
        <Pressable
          accessibilityRole="button"
          onPress={onClearSearch}
          style={({ pressed }) => [
            styles.clearSearchButton,
            pressed ? styles.clearSearchButtonPressed : undefined,
          ]}
        >
          <Text style={styles.clearSearchLabel}>Show all saved items</Text>
        </Pressable>
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
    color: '#5f5647',
    fontSize: 13,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
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
  searchButtonPressed: {
    opacity: 0.88,
  },
  clearSearchButton: {
    alignSelf: 'flex-start',
  },
  clearSearchButtonPressed: {
    opacity: 0.75,
  },
  clearSearchLabel: {
    color: SECONDARY_ACTION_TEXT,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
