import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import type { DriveSearchSummary } from '../utils/drive-search-summary-model';

const STOPPED_EARLY_LABEL = 'Search stopped early';
const RETRY_LABEL = 'Retry';
const SEARCHING_ACCESSIBILITY_LABEL = 'Searching Google Drive';

type DriveSearchSummaryLineProps = {
  onRetry: () => void;
  summary: DriveSearchSummary;
  /** Right-aligned control that shares the line, e.g. `Select`. */
  trailing?: ReactNode;
};

// One fixed-height line: the summary, an inline indicator only while discovery
// runs, and a retry when it stopped early. The line never adds or drops a row,
// so the results below stay where they are.
export const DriveSearchSummaryLine = ({
  onRetry,
  summary,
  trailing,
}: DriveSearchSummaryLineProps) => {
  return (
    <View style={styles.line}>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.label}>
          {summary.label}
        </Text>
        {summary.isRunning ? (
          <ActivityIndicator
            accessibilityLabel={SEARCHING_ACCESSIBILITY_LABEL}
            color={appTheme.colors.textMuted}
            size="small"
          />
        ) : null}
        {summary.stoppedEarly ? (
          <Text numberOfLines={1} style={styles.stoppedEarly}>
            {STOPPED_EARLY_LABEL}
          </Text>
        ) : null}
      </View>
      {summary.stoppedEarly ? (
        <OutlinedActionButton label={RETRY_LABEL} onPress={onRetry} />
      ) : null}
      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  label: {
    flexShrink: 1,
    color: appTheme.colors.textSecondary,
    fontSize: 13,
    fontVariant: [...appTheme.tabularNumbers],
  },
  line: {
    minHeight: appTheme.space.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  stoppedEarly: {
    flexShrink: 1,
    color: appTheme.colors.textMuted,
    fontSize: 13,
  },
});
