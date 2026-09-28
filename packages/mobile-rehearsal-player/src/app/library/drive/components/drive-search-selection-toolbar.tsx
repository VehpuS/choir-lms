import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';

type DriveSearchSelectionToolbarProps = {
  canSelectAll: boolean;
  isActive: boolean;
  isReviewReady: boolean;
  isSelectingAll: boolean;
  onCancel: () => void;
  onContinue: () => void;
  onEdit: () => void;
  onEnter: () => void;
  onSelectAll: () => void;
  resultCount: number;
  selectedCount: number;
};

export const DriveSearchSelectionToolbar = ({
  canSelectAll,
  isActive,
  isReviewReady,
  isSelectingAll,
  onCancel,
  onContinue,
  onEdit,
  onEnter,
  onSelectAll,
  resultCount,
  selectedCount,
}: DriveSearchSelectionToolbarProps) => {
  if (!isActive) {
    return resultCount > 0 ? (
      <View style={styles.entryRow}>
        <Text style={styles.helper}>Choose folders and audio to import.</Text>
        <OutlinedActionButton label="Select" onPress={onEnter} />
      </View>
    ) : null;
  }

  return (
    <View style={styles.toolbar}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCopy}>
          <Text accessibilityLiveRegion="polite" style={styles.count}>
            {selectedCount} selected
          </Text>
          <Text style={styles.helper}>
            {isReviewReady
              ? 'Ready to choose a Library destination.'
              : isSelectingAll
                ? 'Selecting every matching result…'
                : 'Tap any row to select or deselect it.'}
          </Text>
        </View>
        {isSelectingAll ? (
          <ActivityIndicator
            accessibilityLabel="Selecting all matching Drive results"
            color={appTheme.colors.accentText}
          />
        ) : null}
      </View>
      <View style={styles.actions}>
        {isReviewReady ? (
          <OutlinedActionButton label="Edit Selection" onPress={onEdit} />
        ) : (
          <OutlinedActionButton
            disabled={isSelectingAll || !canSelectAll}
            label="Select All Matching"
            onPress={onSelectAll}
          />
        )}
        <OutlinedActionButton label="Cancel" onPress={onCancel} />
        {!isReviewReady ? (
          <OutlinedActionButton
            disabled={selectedCount === 0 || isSelectingAll}
            label="Continue"
            onPress={onContinue}
            variant="accent"
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  count: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  helper: {
    flex: 1,
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolbar: {
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 8,
    backgroundColor: appTheme.colors.bg,
  },
});
