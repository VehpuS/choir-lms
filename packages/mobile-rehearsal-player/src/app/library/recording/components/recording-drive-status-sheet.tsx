import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import type { ExportKindLine } from '../export/row-export-status';

const { colors, radius, space, type } = appTheme;

const STATE_LABELS: Record<ExportKindLine['state'], string> = {
  'on-drive': 'On Drive',
  'not-exported': 'Not exported',
  failed: 'Failed',
  pending: 'Pending',
};

type RecordingDriveStatusSheetProps = {
  name: string;
  /** Where copies go, when auto-export is on. */
  destination?: string;
  lines: readonly ExportKindLine[];
  onRetry: () => void;
  onClose: () => void;
};

/** What reached Drive for one recording, what failed and why, with a `Retry` for the failures. */
export const RecordingDriveStatusSheet = ({
  destination,
  lines,
  name,
  onClose,
  onRetry,
}: RecordingDriveStatusSheetProps) => {
  const hasFailure = lines.some((line) => line.canRetry);

  return (
    <BottomSheetSurface
      footer={
        <MenuGroup>
          <MenuRow label="Close" onPress={onClose} tone="cancel" />
        </MenuGroup>
      }
      isVisible={true}
      onClose={onClose}
      scrollable={true}
      title={`Drive status · ${name}`}
    >
      <View style={styles.body}>
        {destination ? (
          <Text style={styles.detail}>{`Auto-export to ${destination}`}</Text>
        ) : null}
        {lines.length === 0 ? (
          <Text style={styles.detail}>Nothing has been copied to Drive.</Text>
        ) : null}
        {lines.map((line) => (
          <View key={line.kind} style={styles.line}>
            <View style={styles.lineText}>
              <Text style={styles.title}>{line.label}</Text>
              <Text style={styles.detail}>{line.detail}</Text>
            </View>
            <Text
              style={[
                styles.state,
                line.state === 'failed' ? styles.bad : null,
              ]}
            >
              {STATE_LABELS[line.state]}
            </Text>
          </View>
        ))}
        {hasFailure ? (
          <OutlinedActionButton label="Retry" onPress={onRetry} />
        ) : null}
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  bad: { color: colors.danger },
  body: { gap: space.sm },
  detail: { ...type.rowMeta, color: colors.textMuted },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  lineText: { flex: 1, gap: space.xxs },
  state: { ...type.rowMeta, color: colors.text },
  title: { ...type.rowTitle, color: colors.text },
});
