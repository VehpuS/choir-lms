import { StyleSheet, Text, View } from 'react-native';

import { InteractionChip } from '../../components/interaction-chip';

import { appTheme } from '../../../utils/theme';

type RecentSearchSuggestionsProps = {
  onSelectRecentSearchTerm: (value: string) => void;
  onSelectRecentSearchTermPressIn?: () => void;
  recentSearchTerms: string[];
  title?: string;
};

export const RecentSearchSuggestions = ({
  onSelectRecentSearchTerm,
  onSelectRecentSearchTermPressIn,
  recentSearchTerms,
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
            <InteractionChip
              accessibilityLabel={`Run recent search ${searchTerm}`}
              key={searchTerm.toLocaleLowerCase()}
              label={searchTerm}
              onPress={() => {
                onSelectRecentSearchTerm(searchTerm);
              }}
              onPressIn={onSelectRecentSearchTermPressIn}
              variant="action"
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: appTheme.space.xs,
  },
  title: {
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.space.xs,
  },
});
