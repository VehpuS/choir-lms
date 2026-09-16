import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

const SelectionAction = ({
  disabled = false,
  label,
  onPress,
  primary = false,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.action,
      primary ? styles.primaryAction : styles.secondaryAction,
      pressed && !disabled ? styles.actionPressed : undefined,
      disabled ? styles.actionDisabled : undefined,
    ]}
  >
    <Text
      style={primary ? styles.primaryActionLabel : styles.secondaryActionLabel}
    >
      {label}
    </Text>
  </Pressable>
);

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
        <SelectionAction label="Select" onPress={onEnter} />
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
            color={appTheme.colors.listMarker}
          />
        ) : null}
      </View>
      <View style={styles.actions}>
        {isReviewReady ? (
          <SelectionAction label="Edit Selection" onPress={onEdit} />
        ) : (
          <SelectionAction
            disabled={isSelectingAll || !canSelectAll}
            label="Select All Matching"
            onPress={onSelectAll}
          />
        )}
        <SelectionAction label="Cancel" onPress={onCancel} />
        {!isReviewReady ? (
          <SelectionAction
            disabled={selectedCount === 0 || isSelectingAll}
            label="Continue"
            onPress={onContinue}
            primary={true}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  actionDisabled: {
    opacity: 0.56,
  },
  actionPressed: {
    opacity: 0.88,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  count: {
    color: appTheme.colors.primaryText,
    fontSize: 16,
    fontWeight: '700',
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
  primaryAction: {
    borderColor: appTheme.colors.listMarker,
    backgroundColor: appTheme.colors.listMarker,
  },
  primaryActionLabel: {
    color: '#fff8ef',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    borderColor: appTheme.colors.border,
    backgroundColor: '#f2ece1',
  },
  secondaryActionLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: '#faf6ee',
  },
});
