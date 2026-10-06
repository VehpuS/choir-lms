import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { appTheme } from '../../utils/theme';
import { getSelectionCountLabel } from './bulk-action-model';

type SelectionBarSecondaryAction = {
  isDisabled?: boolean;
  label: string;
  onPress: () => void;
};

type SelectionBarProps = {
  /** Short line under the count, e.g. progress of a pending select-all. */
  helperText?: string;
  /** Shows a spinner while a selection source (select-all) is still loading. */
  isBusy?: boolean;
  busyLabel?: string;
  onCancel: () => void;
  /** An optional extra action such as `Select all matching` or `View selection`. */
  secondaryAction?: SelectionBarSecondaryAction;
  selectedCount: number;
};

// Replaces the Drive search selection toolbar: a live count, one optional
// secondary action, and `Cancel`. Primary actions live in the pinned bar.
export const SelectionBar = ({
  busyLabel,
  helperText,
  isBusy = false,
  onCancel,
  secondaryAction,
  selectedCount,
}: SelectionBarProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <Text
          accessibilityLiveRegion="polite"
          numberOfLines={1}
          style={styles.count}
        >
          {getSelectionCountLabel(selectedCount)}
        </Text>
        {secondaryAction ? (
          <OutlinedActionButton
            disabled={secondaryAction.isDisabled}
            label={secondaryAction.label}
            onPress={secondaryAction.onPress}
          />
        ) : null}
        <OutlinedActionButton label="Cancel" onPress={onCancel} />
      </View>
      {helperText || isBusy ? (
        <View style={styles.helperRow}>
          {isBusy ? (
            <ActivityIndicator
              accessibilityLabel={busyLabel}
              color={appTheme.colors.accentText}
              size="small"
            />
          ) : null}
          {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  container: {
    gap: appTheme.space.xs,
  },
  count: {
    flex: 1,
    minWidth: 0,
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
  },
  helper: {
    color: appTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
