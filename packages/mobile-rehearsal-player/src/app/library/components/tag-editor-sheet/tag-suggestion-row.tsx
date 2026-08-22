import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../interaction-chip';

type TagSuggestionRowProps = {
  isSaving: boolean;
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
};

export const TagSuggestionRow = ({
  isSaving,
  suggestions,
  onSelectSuggestion,
}: TagSuggestionRowProps) => {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.suggestionSection}>
      <Text style={styles.suggestionLabel}>Suggested tags</Text>
      <View style={styles.suggestionRow}>
        {suggestions.map((suggestion) => {
          return (
            <InteractionChip
              accessibilityLabel={`Suggested tag ${suggestion}`}
              disabled={isSaving}
              key={suggestion}
              label={suggestion}
              onPress={() => {
                onSelectSuggestion(suggestion);
              }}
              variant="passive"
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  suggestionLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionSection: {
    gap: 8,
  },
});
