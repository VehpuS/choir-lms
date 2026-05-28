import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type DriveLibrarySearchPanelProps = {
  canSearch: boolean;
  isLoading: boolean;
  isSearchMode: boolean;
  onClearSearch: () => void;
  onSearch: () => void;
  onSearchQueryChange: (value: string) => void;
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
  isLoading,
  isSearchMode,
  onClearSearch,
  onSearch,
  onSearchQueryChange,
  searchQuery,
}: DriveLibrarySearchPanelProps) => {
  return (
    <View style={styles.searchPanel}>
      <View style={styles.searchRow}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onSearchQueryChange}
          onSubmitEditing={onSearch}
          placeholder="Search My Drive and shared folders"
          placeholderTextColor={PLACEHOLDER_TEXT}
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!canSearch || isLoading}
          onPress={onSearch}
          style={({ pressed }) => [
            styles.searchButton,
            pressed ? styles.searchButtonPressed : undefined,
            !canSearch || isLoading ? styles.searchButtonDisabled : undefined,
          ]}
        >
          <Text style={styles.searchButtonLabel}>Search</Text>
        </Pressable>
      </View>
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
    gap: 12,
  },
  searchInput: {
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
  },
  searchButtonPressed: {
    opacity: 0.88,
  },
  searchButtonDisabled: {
    opacity: 0.56,
  },
  searchButtonLabel: {
    color: PRIMARY_ACTION_TEXT,
    fontSize: 14,
    fontWeight: '600',
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
