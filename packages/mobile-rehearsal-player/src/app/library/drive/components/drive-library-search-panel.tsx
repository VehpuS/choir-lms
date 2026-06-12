import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RecentSearchSuggestions } from '../../components/RecentSearchSuggestions';

type DriveLibrarySearchPanelProps = {
  canSearch: boolean;
  helperCopy: string;
  isLoading: boolean;
  isSearchMode: boolean;
  onClearSearch: () => void;
  onSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectRecentSearchTerm: (value: string) => void;
  placeholderCopy: string;
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

export const DriveLibrarySearchPanel = ({
  canSearch,
  helperCopy: _helperCopy,
  isLoading,
  isSearchMode,
  onClearSearch,
  onSearch,
  onSearchQueryChange,
  onSelectRecentSearchTerm,
  placeholderCopy,
  recentSearchTerms,
  searchQuery,
}: DriveLibrarySearchPanelProps) => {
  const shouldShowRecentSearchTerms =
    canSearch &&
    !isLoading &&
    searchQuery.trim().length === 0 &&
    recentSearchTerms.length > 0;

  return (
    <View style={styles.searchPanel}>
      <View style={styles.searchRow}>
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
        <Pressable
          accessibilityLabel="Search Google Drive"
          accessibilityRole="button"
          disabled={!canSearch || isLoading}
          onPress={onSearch}
          style={({ pressed }) => [
            styles.searchButton,
            pressed ? styles.searchButtonPressed : undefined,
            !canSearch || isLoading ? styles.searchButtonDisabled : undefined,
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
          <Text style={styles.clearSearchLabel}>Browse folders</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  searchPanel: {
    gap: 12,
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
  searchButtonDisabled: {
    opacity: 0.56,
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
