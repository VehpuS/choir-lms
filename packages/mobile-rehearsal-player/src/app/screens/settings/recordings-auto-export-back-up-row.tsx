import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { LibraryFilesConfirmationDialog } from '../../library/selection/library-files-confirmation-dialog';
import { appTheme } from '../../utils/theme';
import {
  AUTO_EXPORT_COPY,
  getBackUpConfirmation,
  type AutoExportSettingsView,
} from './recordings-auto-export-model';

const { colors, space } = appTheme;

type BackUpRowProps = {
  backUp: AutoExportSettingsView['backUp'];
  onConfirm: () => void;
};

/**
 * `Back up existing recordings`: it can queue a long backlog, so it asks first,
 * saying how many recordings and how much data, and can be declined.
 */
export const RecordingsAutoExportBackUpRow = ({
  backUp,
  onConfirm,
}: BackUpRowProps) => {
  const [isAsking, setIsAsking] = useState(false);

  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{AUTO_EXPORT_COPY.backUpTitle}</Text>
        <Text style={styles.body}>{backUp.detail}</Text>
      </View>
      <OutlinedActionButton
        disabled={backUp.count === 0}
        label={AUTO_EXPORT_COPY.backUpLabel}
        onPress={() => setIsAsking(true)}
      />
      <LibraryFilesConfirmationDialog
        content={isAsking ? getBackUpConfirmation(backUp) : null}
        isMutating={false}
        onCancel={() => setIsAsking(false)}
        onConfirm={() => {
          setIsAsking(false);
          onConfirm();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    minHeight: space.touchTarget,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
});
