import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';
import { StyleSheet, Text } from 'react-native';

import { ExplorerListRow, ExplorerListSurface } from '../../../components/explorer';
import { appTheme } from '../../../../utils/theme';
import { EMPTY_SAVED_TAGS_MESSAGE, getSavedTagUsageMetadataLabel } from './model';

type SavedTagsListProps = {
  tagUsage: RehearsalLibraryTagUsage[];
};

export const SavedTagsList = ({ tagUsage }: SavedTagsListProps) => {
  if (tagUsage.length === 0) {
    return <Text style={styles.emptyMessage}>{EMPTY_SAVED_TAGS_MESSAGE}</Text>;
  }

  return (
    <ExplorerListSurface>
      {tagUsage.map((usage) => {
        return (
          <ExplorerListRow
            key={usage.tag}
            leadingIcon={
              <MaterialCommunityIcons
                color={appTheme.colors.secondaryText}
                name="tag-outline"
                size={22}
              />
            }
            metadata={
              <Text style={styles.rowSupportingLabel}>
                {getSavedTagUsageMetadataLabel(usage)}
              </Text>
            }
            title={<Text style={styles.rowTitle}>{usage.tag}</Text>}
          />
        );
      })}
    </ExplorerListSurface>
  );
};

const styles = StyleSheet.create({
  emptyMessage: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  rowSupportingLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
});
