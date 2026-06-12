import { Pressable, StyleSheet, Text, View } from 'react-native';

type RecentSearchSuggestionsProps = {
  recentSearchTerms: string[];
  onSelectRecentSearchTerm: (value: string) => void;
  title?: string;
};

const CHIP_BACKGROUND = '#f2ece1';
const CHIP_BACKGROUND_PRESSED = '#e3dac9';
const CHIP_TEXT = '#2f5a4b';

export const RecentSearchSuggestions = ({
  recentSearchTerms,
  onSelectRecentSearchTerm,
  title = 'Recent searches',
}: RecentSearchSuggestionsProps) => {
  if (recentSearchTerms.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chipRow}>
        {recentSearchTerms.map((searchTerm) => {
          return (
            <Pressable
              key={searchTerm.toLocaleLowerCase()}
              accessibilityLabel={`Run recent search ${searchTerm}`}
              accessibilityRole="button"
              onPress={() => {
                onSelectRecentSearchTerm(searchTerm);
              }}
              style={({ pressed }) => [
                styles.chip,
                pressed ? styles.chipPressed : undefined,
              ]}
            >
              <Text style={styles.chipLabel}>{searchTerm}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    color: '#5f5647',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CHIP_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: CHIP_BACKGROUND_PRESSED,
  },
  chipLabel: {
    color: CHIP_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
});
